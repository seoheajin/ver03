'use strict';

const { DVSClient } = require('dvs-client');


class Vivid extends EventTarget{

  constructor() {
    super();
    this.delay = 500;
    this.events = {
      GET_TEAMS : 'getTeams',
      GET_PROJECT : 'getProjects',
      GET_BATCH : 'getBatchs'
    };
    this.rawGroup = {};
    this.rawProjects = {};
    this.rawBatchHistory = {};
    this.group = {};
    this.project = {};
    this.batchHistory = {};
  }

  get Events(){
    return this.events;
  }

  async connect(user){
    this.DVS = new DVSClient(user);
    this.DVS.getTeamsForUser().then(d => this.loadTeamData(d));
    this.DVS.addEventListener(DVSClient.SUBSCRIPTION_UPDATE, (e) => {
      console.log(e);
    });
  }

  async loadTeamData(_d){ 
    const getCateNum = (_p) => {
      let cns = [];
      for(let j=0; j < _p.length; j++){
          if(_p[j].displayName.indexOf('/') === -1)
            continue;
          let cn = _p[j].displayName.slice(0, _p[j].displayName.indexOf('/'));
          (cns.indexOf(cn) === -1) && cns.push(cn);
        }
      return cns;
    }

    let promises = [], rd = [];
    
    _d.forEach((d, i) => {
      window.setTimeout(() => {
        promises.push(this.DVS.listVividProjects(d.id));
      }, 200 * i);
    });

    window.setTimeout(() => {
      Promise.all(promises).then((values) => {
        _d.map((p, i) => { 
          this.rawProjects[p.id] = values[i];
          rd.push({
            name: p.displayName,
            projectID : p.id,
            projectNum : values[i].length,
            categories : getCateNum(values[i])
          });
        });
        return this.dispatchEvent(new CustomEvent(this.Events.GET_TEAMS, {'detail':rd}));
      });
    }, 200 * _d.length);
  }

  async getProjectDetails(_id){ 
    this.group = this.rawProjects[_id];

    const mappingProjects = (r) => {
        let dn = r['displayName'],
            pn = dn.indexOf('/') === -1 ? dn : dn.slice(dn.indexOf('/')+1, dn.length),
            pc = dn.indexOf('/') === -1 ? '' : dn.slice(0, dn.indexOf('/'));
      return {name:pn, id:r.projectId, category:pc, createdAt:r.createdAt, updatedAt:r.updatedAt }; 
    }
    
    if(typeof this.group[0]['artifactMetadata'] !== 'undefined'){
      this.group.map(r => {
        this.dispatchEvent(new CustomEvent(this.Events.GET_PROJECT, {'detail': mappingProjects(r)}));
      });
      return;
    }

    const updateDetails = (d) => { 
      for(let i = 0; i < this.group.length; i++){
        if(this.group[i].projectId !== d.projectId)
          continue;
        
        for(let pr in d)
          this.group[i][pr] = d[pr];
        
        this.dispatchEvent(new CustomEvent(this.Events.GET_PROJECT, {'detail': mappingProjects(this.group[i])}));
      }
    }
    const singleCall = () => {
      this.DVS.getProjectDetails(this.group[_inx].projectId)
      .then(d => updateDetails(d) )
      .catch(err => { console.log(err) })
      .finally(() => {
        if(_inx < this.group.length-1){
          _inx++;
          singleCall();
        }
      });
    }
    let _inx = 0;
    singleCall();
  }

  getProjectDetailsById(_id){
    this.project = {};
    for(let p in this.group){
      (_id === this.group[p]['projectId']) && (this.project = this.group[p]);
    }
    return this.project;
  }

  async createRenderBatch(queue, customFFmpegOptions){
    let d = await this.DVS.requestBatchRender(this.project, queue, customFFmpegOptions);

    if(typeof d.batches === 'undefined' || d.batches.length === 0)
      return null;
    
    this.getLatestRequestById(this.project.projectId);

    const renders = d.batches[0].renders;
    if(renders.length === 1 && renders[0].videoS3Key.search('-testRender-') > -1)
      return renders[0].videoS3Key.replace("_renders/", "https://d3jpxtk5lan59j.cloudfront.net/");
    else
      return renders[0];
  }

  async getHistoryById(_id){

    if(typeof this.batchHistory[_id] !== 'undefined'){
      if(typeof this.batchHistory[_id] === 'string'){
        this.dispatchEvent(new CustomEvent(this.Events.GET_BATCH, {'detail':this.batchHistory[_id]}));
      }else{
        for(let k in this.batchHistory[_id])
          this.dispatchEvent(new CustomEvent(this.Events.GET_BATCH, {'detail':this.batchHistory[_id][k]}));
      }
      return;
    }

    const d = await this.DVS.getRequestsForProject(_id);

    if(typeof d.requests === 'undefined' || d.requests.length === 0){
      this.batchHistory[_id] = 'No batch is found.';
      this.dispatchEvent(new CustomEvent(this.Events.GET_BATCH, {'detail':this.batchHistory[_id]}));
      return;
    }

    let _a = [], _n = [], _i;
    for(let i = 0; i < d.requests.length; i++){
      if(d.requests[i].batches.length === 0)
        continue;
      _a.push(d.requests[i].createdAt+'_'+i);
    }
    
    _a.sort();
    _a.reverse();

    for(let j = 0; j < _a.length; j++){
      _i = parseInt(_a[j].split('_')[1]);
      _n.push(d.requests[_i]);
    }
    
    (typeof this.batchHistory[_id] === 'undefined') && (this.batchHistory[_id] = {});
    this.getBatchDetails(_id, _n);
  }

  async getLatestRequestById(_id){
    const d = await this.DVS.getRequestsForProject(_id);

    if(typeof this.batchHistory[_id] === 'undefined' || typeof d.requests === 'undefined' || d.requests.length === 0)
      return;

    let na = [];
    for(let i = 0; i < d.requests.length; i++){
      if(typeof this.batchHistory[_id][d.requests[i].requestId] !== 'undefined')
        continue;

      this.batchHistory[_id][d.requests[i].requestId] = {
        id:d.requests[i].requestId, date:d.requests[i].createdAt,
        batches:d.requests[i].batches, status:'REQUESTED', videos:[], rendered:0, published:0
      }
    }
  }

  async getBatchDetails(_id, _d){ 
    let requestInx = 0, batchInx = 0;
    
    const batchCall = (_requestId, _batch) => {
      this.DVS.getBatchInfo(_batch).then(d => {
        this.batchHistory[_id][_requestId].status = d.batchStatus;
        this.batchHistory[_id][_requestId].videos = [...this.batchHistory[_id][_requestId].videos,  ...d.renders];
        d.renders.forEach(v => {
          v.published && this.batchHistory[_id][_requestId].published++;
          v.renderStatus === 'DONE' && this.batchHistory[_id][_requestId].rendered++;
        });
        moveForward();
      });
    }

    const moveForward = () => {
      if(requestInx === _d.length)
        return;

      if(batchInx === _d[requestInx].batches.length){
        this.dispatchEvent(new CustomEvent(this.Events.GET_BATCH, {'detail':this.batchHistory[_id][_d[requestInx].requestId]}));
        requestInx++;
        batchInx = 0;
        moveForward();
        return;
      }

      if(typeof this.batchHistory[_id][_d[requestInx].requestId] === 'undefined'){
        this.batchHistory[_id][_d[requestInx].requestId] = {
          id:_d[requestInx].requestId, date:_d[requestInx].createdAt, 
          status:'', videos:[], rendered:0, published:0
        }
      }

      batchCall(_d[requestInx].requestId, _d[requestInx].batches[batchInx]);
      batchInx++;
    }
    moveForward();
  }

  getBatchById(_pid, _bid){
   return this.batchHistory[_pid][_bid] || {};
  }

  async getRenderInfo(requestId){
    this.DVS.getRenderInfo(requestId).then(r => {
      console.log(r);
      return r;
    });
  }

}

export default Vivid;
