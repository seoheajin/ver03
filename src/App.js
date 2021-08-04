import React from 'react';
import ReactDOM from 'react-dom';
import XLSX from 'xlsx';
import Vivid from './vivid.js';
import { DVSClient } from 'dvs-client';
import './App.css';

const { CognitoIdentityProvider } = require("@aws-sdk/client-cognito-identity-provider");

const REGION = "eu-west-1";
const CLIENT_ID = "34l543jqdt31p8s5a3pk89ed0b";

const provider = new CognitoIdentityProvider({region: REGION});

const { ProjectUnits, ProjectList, RenderingWindow, RenderingSummery, ProjectHistory, BatchLine, ProjectPublish } = require("./components");
const vivid = new Vivid();

let teamID;
let pageNum;
let selectedProject;

let projects = {};
let renderedVideos = [];
let batchData = {};


class App extends React.Component {

	constructor() {
		super();
		this.state = {
			pageNum: 0,
			projects: {},
			teamID: "",
			LogoutVisible:false
		}
	}

	login() {
		if(document.getElementById('input_user').value.length * document.getElementById('input_password').value.length === 0){
			document.querySelector('.loginBox:first-child div').style.display = 'block';
			document.querySelector('.loginBox:first-child div').innerHTML = 'Please fill out Id and password.';
		}else{
			this.initLoading(document.getElementsByClassName('loginBox')[0]);
			document.querySelector('.bodyContainer.login .loginBox:first-child div').style.display = 'none';
			this.signIn(document.getElementById('input_user').value, document.getElementById('input_password').value);//joncosta Pokemon25!
		}
	}

	async signIn(username, password){
		const THIS = this;
		async function changePassword(_password, _result){
			try{
				let challengeResult = await provider.respondToAuthChallenge({
					ChallengeName:"NEW_PASSWORD_REQUIRED",
					ClientId:CLIENT_ID,
					ChallengeResponses:{ USERNAME:username, NEW_PASSWORD:_password },
					Session:_result.Session
		        });
		        initVivid(challengeResult.AuthenticationResult);
			}catch(e){
				this.removeLoading(document.getElementsByClassName('loginBox')[1]);
				document.querySelector('.loginBox:last-child div.error').style.display = 'block';
				document.getElementById('input_new').setAttribute('class', 'element error');
				document.getElementById('input_duplicate').setAttribute('class', 'element error');
			}
		}

		function initVivid(_result){
			vivid.addEventListener(vivid.Events.GET_TEAMS, THIS.getTeams.bind(THIS));
			vivid.addEventListener(vivid.Events.GET_PROJECT, THIS.getProject.bind(THIS));
			vivid.addEventListener(vivid.Events.GET_BATCH, (e) => THIS.addBatchLine(e.detail));
			vivid.connect({ username:username, IdToken:_result.IdToken, AccessToken:_result.AccessToken}); 
			document.getElementsByTagName('body')[0].setAttribute('class', 'title');
			this.removeLoading(document.getElementsByClassName('loginBox')[0]);
			this.removeLoading(document.getElementsByClassName('loginBox')[1]);
			document.getElementById('userPicture').style.backgroundImage = `url("https://internal-cdn.amazon.com/badgephotos.amazon.com/?uid=${username}")`;
			document.getElementById('userName').innerHTML = `Hello ${username}!`;
		}

		try {
			let result = await provider.initiateAuth({
				AuthFlow:"USER_PASSWORD_AUTH",
				ClientId:CLIENT_ID,
				AuthParameters: { USERNAME: username, PASSWORD: password }
			});

			if(typeof result.ChallengeName === 'undefined')
				return initVivid(result.AuthenticationResult);

			this.removeLoading(document.getElementsByClassName('loginBox')[0]);
			document.querySelector('.loginBox:first-child').style.display = 'none';
			document.querySelector('.loginBox:last-child').style.display = 'block';
			document.getElementById('changeBTN').addEventListener('click', () => {
				if(document.getElementById('input_duplicate').value === document.getElementById('input_new').value || document.getElementById('input_new').value.length > 0){
					this.initLoading(document.getElementsByClassName('loginBox')[1]);
					changePassword(document.getElementById('input_new').value, result);
				}
			});
		}catch(err){
			if(err.name === "NotAuthorizedException"){
				document.querySelector('.loginBox:first-child div').style.display = 'block';
				document.querySelector('.loginBox:first-child div').innerHTML = 'Incorrect username or password.';
				this.removeLoading(document.getElementsByClassName('loginBox')[0]);
				document.getElementById('input_user').setAttribute('class', 'element error');
				document.getElementById('input_password').setAttribute('class', 'element error');
			}
		}
	}

	logout(){
		window.location.reload();
	}


	getTeams(e){
		document.getElementsByTagName('body')[0].setAttribute('class', 'title');
		this.removeClass(document.getElementsByClassName('loginBox')[0], 'loading');

		if(e.detail.length === 0)
			return document.querySelector(".bodyContainer.team").innerHTML = 'No team project exists';

		if(e.detail.length === 1){
			document.getElementById('backToTitleBTN').style.display = 'none';
			return this.team_onclickHandler(e.detail[0]);
		}

		ReactDOM.render(
			<ProjectUnits data={e.detail} callback={(d) => {this.team_onclickHandler(d)}} />,
			document.querySelector(".bodyContainer.team")
		);
	}

	getProject(e){
		//console.log('getProject', e);
		let newProject = new ProjectList(e.detail, this.projectList_onclickHandler.bind(this));
		projects[teamID].push({visible:true, elem:newProject.element});
		this.removeLoading(document.querySelector('#listTable table tbody'));
		(projects[teamID].length < 11) && document.querySelector('#listTable table tbody').appendChild(newProject.element);
		(projects[teamID].length === 11) && this.paging(1);
	}

	addBatchLine(e){
		//console.log(e);
		if(document.querySelector('#batchHistory table tbody') === null)
			return;
		this.removeLoading(document.querySelector('#batchHistory table tbody'));
		new BatchLine(e, this.openPublishWindow.bind(this));
	}


	team_onclickHandler(_d) {
		this.replaceClass(document.getElementsByTagName('body')[0], 'title', 'navi');
		document.querySelector('#listHeader h1').innerHTML = _d['name'];

		teamID = _d['projectID'];
		document.querySelector('#listTable table tbody').innerHTML = '';
		document.getElementById('listNumbering').style.display = 'none';

		this.addClass(document.getElementById('listFilters'), 'inactive');
		document.getElementById('searchBox').value = '';
		document.querySelector("#dateBTN .dropdownField").innerHTML = 'Date';
		this.selectListItem('#dateOptions li', 'none');
		document.querySelector("#userBTN .dropdownField").innerHTML = 'Category';
		document.getElementById('userBTN').style.display = _d.categories.length === 0 ? "none" : "block";
		
		((_c, _t) => {
			_c.map((p) => {
				let _li = document.createElement('li');
				_li.innerHTML = `<span></span>${p}`;
				_li.addEventListener('click', () => {
					_t.sortingByCategory(p);
				});
				document.getElementById("userOptions").appendChild(_li);
			});
		})(['all', ..._d.categories], this);

		if(typeof projects[teamID] === 'undefined'){
			projects[teamID] = [];
			vivid.getProjectDetails(teamID);
			this.initLoading( document.querySelector('#listTable table tbody') );
		}else{
			projects[teamID].forEach(p => p.visible = true );
			this.paging(1);
		}
	}

	projectList_onclickHandler(action, id){
		selectedProject = vivid.getProjectDetailsById(id);
		//console.log(action, id, this);
		switch(action){
			case 'BATCH TEMPLATE':
				this.downloadTemplate(selectedProject);
				break;
			case 'RENDER':
				this.openFloatingWin( <RenderingWindow data={selectedProject} callback={this.renderingWindow_onClickHandler.bind(this)} /> );
				break;
			case 'HISTORY':
				this.openFloatingWin( <ProjectHistory data={selectedProject.displayName} callback={this.ProjectHistory_onClickHandler.bind(this)} /> );
				vivid.getHistoryById(id);
				break;
			case 'PUBLISH':
				console.log(action, id);
				break;
		}
	}

	renderingWindow_onClickHandler(action, data){
		//console.log(action, data);
		switch(action){
			case 'close':
				this.closeFloatingWin();
				break;
			case 'testRender':
				this.initLoading(document.getElementById('defaultSetting'));
				vivid.createRenderBatch(data).then( r => {
					if(r === null) console.log('rendering is fail.')
					else window.open(r);
					this.removeLoading(document.getElementById('defaultSetting'));
				});
				break;
			case 'render':
				this.openFloatingWin( <RenderingSummery data={data} callback={this.renderingSummery_onClickHandler.bind(this)} />, 1);
				break;
			default:
				this.openPopup(`${action}Options`);
				break;
		}
	}

	renderingSummery_onClickHandler(action, data){
		switch(action){
			case 'close':
				this.closeFloatingWin(1);
				break;
			case 'render':
				this.closeFloatingWin();
				this.closeFloatingWin(1);
				document.querySelector(`#project-${data.id} td:nth-child(4)`).innerHTML = 'Rendering...';
				this.addClass(document.getElementById(`project-${data.id}`), 'rendering');

				vivid.createRenderBatch(data.queue, data.customFFmpegOptions).then( batches => {
					if(batches === null)
						return document.querySelector(`#project-${data.id} td:nth-child(4)`).innerHTML = 'Rendering fails';
					vivid.getLatestRequestById(data.id);
				});
				break;
		}
	}

	ProjectHistory_onClickHandler(action){
		if(action === 'close')
			return this.closeFloatingWin();

		if(action === 'filter')
			return this.openPopup('batchOptions');

		const TRlist = document.querySelectorAll('#batchHistory table tbody tr');
		TRlist.forEach(elem => {
			elem.style.display = (action === 'All') ? 'table' :
								 (action === 'Preparing' && elem.getAttribute('status') === 'REQUESTED') ? 'table' :
								 (action === 'Publishing' && (elem.getAttribute('status') === 'DONE' || elem.getAttribute('status') === 'PUBLISHED')) ? 'table' :
								 (action === 'Error' && (elem.getAttribute('status') === 'ERROR' || elem.getAttribute('status') === 'FAILED')) ? 'table' : 'none';
		});
	}

	openPublishWindow(_id){
		this.addClass(document.getElementsByTagName('body')[0], 'scrollReveal');
		this.openFloatingWin( <ProjectPublish head={selectedProject.displayName} data={vivid.getBatchById(selectedProject.projectId, _id)} callback={this.ProjectPublish_onClickHandler.bind(this)} />, 1);
	}

	ProjectPublish_onClickHandler(action, data){
		switch(action){
			case 'close':
				this.closeFloatingWin(1);
				this.removeClass(document.getElementsByTagName('body')[0], 'scrollReveal');
				break;
			case 'CSV':
				this.invokeDownload({
					'profile' : [{
						"BatchId": data.id || '',
						"published": data.published || 'N/A',
						"rendered": data.rendered || 'N/A',
						"status": data.status || ''
					}],
					'videos' : data.videos
				}, `output-${data.id}-${data.date}`);
				break;
			case 'publish':
				console.log('publish video(s)', data);
				break;
		}
	}

	paging = (_t) => {
		if(isNaN(_t))
			pageNum = (_t === 'pre') ? pageNum-1 : pageNum+1;
		else
			pageNum = parseInt(_t);

		let _inx = 0;
		document.querySelector('#listTable table tbody').innerHTML = '';
		projects[teamID].forEach((p, i) => {
			if(p.visible === true){
				_inx++;
				(_inx > (pageNum-1) * 10 && _inx <= pageNum * 10) && document.querySelector('#listTable table tbody').appendChild(p.elem);
			}
		});

		if(_inx <= 10)
			return document.getElementById('listNumbering').style.display = 'none';

		let _maxPage = Math.ceil(_inx/10);
		let _children = document.querySelectorAll('#listNumbering ul li');
		for(let i=0; i < _children.length; i++){
			if(i === 0){
				_children[i].style.display = (pageNum === 1) ? 'none' : 'inline-block';
			}else if(i === _children.length-1){
				_children[i].style.display = (pageNum === _maxPage) ? 'none' : 'inline-block';
			}else{
				_children[i].style.display = i <= _maxPage ? 'inline-block' : 'none';
				_children[i].setAttribute('class', (i === pageNum ? 'selected' : ''));
			}
		}
		this.removeClass(document.getElementById('listFilters'), 'inactive');
		document.getElementById('listNumbering').style.display = 'block';
	}

	search(){
		this.sortingProjects('name', document.getElementById('searchBox').value);
		this.selectListItem('#userOptions li', 'none');
		document.querySelector("#userBTN .dropdownField").innerHTML = 'User';
	}

	sortingByDate = (id) => {
		const _l = id === "newToLate" ? "Newest to Latest" : "Latest to Newest";
		this.selectListItem('#dateOptions li', _l);
		document.querySelector("#dateBTN .dropdownField").innerHTML = _l;

		let n = [], a, r = [];
		for(let i = 0; i < projects[teamID].length; i++){
			a = projects[teamID][i].elem.getAttribute('date');
			n.push(a+'_'+i);
		}
		n.sort();
		(id === 'newToLate') && (n = n.reverse());

		for(let j = 0; j < n.length; j++){
			a = parseInt(n[j].split('_')[1]);
			r.push(projects[teamID][a]);
		}
		projects[teamID] = r;
		this.paging(pageNum);
	}

	sortingByCategory(id){
		this.selectListItem('#userOptions li', id);
		document.querySelector("#userBTN .dropdownField").innerHTML = id;
		document.getElementById('searchBox').value = '';
		this.sortingProjects('category', id);
	}

	sortingProjects(term, key){
		let a, n = 0;
		for(let i = 0; i < projects[teamID].length; i++){
			a = projects[teamID][i].elem.getAttribute(term);
			if(term === 'category'){
				projects[teamID][i].visible = (a === key || key === 'all') ? true : false;
				(a === key || key === 'all') && n++;
			}else if(term === 'name'){
				projects[teamID][i].visible = (a.toLowerCase().search(key.toLowerCase()) > -1) ? true : false;
				(a.toLowerCase().search(key.toLowerCase()) > -1) && n++;
			}
		}
		(n < pageNum*10) && (pageNum = 1);
		this.paging(pageNum);
	}


	downloadTemplate(_p){
		let _data = {
			"VividProject" : [{
				"ProjectId": _p.projectId || '',
				"ProjectVersion": typeof _p.recentProjectVersions !== 'undefined' ? _p.recentProjectVersions[0].projectVersion || '' : '',
				"Width": _p.width || '1920',
				"Height": _p.height || '1080',
				"Format": _p.format || 'mp4',
				"PosterFormat": "png",
				"ResizeStrategy": "fit"
			}],
			"Inputs":[{
				"RenderId": _p.renderId || "",
				"Output": "",
				"PosterOutput": ""
			}]
		};

		try{
			for(let p in _p.manifest.defaultContentTemplateInput){
				if(_p.manifest.defaultContentTemplateInput[p].constructor === String){
					_data['Inputs'][0][p] = _p.manifest.defaultContentTemplateInput[p];
				}else if(_p.manifest.defaultContentTemplateInput[p].constructor === Object){
					for(let s in _p.manifest.defaultContentTemplateInput[p])
						_data['Inputs'][0][`${p}.${s}`] = _p.manifest.defaultContentTemplateInput[p][s];
				}
			}
		}catch(e){ }
		this.invokeDownload(_data, `template-${_p.projectId}`);
	}

	invokeDownload(_data, _fileName){
		let wb = XLSX.utils.book_new();
		for(let pr in _data){
			let new_sheet = XLSX.utils.json_to_sheet(_data[pr]);
			XLSX.utils.book_append_sheet(wb, new_sheet, pr);
		}

		function s2ab(s) {
			var buf = new ArrayBuffer(s.length);
			var view = new Uint8Array(buf);
			for (var i=0; i!=s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
			return buf;
		}

		let write_book = XLSX.write(wb, {bookType:'xlsx', type:'binary'});
		let xlsxBlob = new Blob([s2ab(write_book)], {type:"application/octet-stream"});
		let xlsxUrl = URL.createObjectURL(xlsxBlob);
		let _a = document.createElement('a');
		_a.href = xlsxUrl;
		_a.target = '_top';
		_a.download = `${_fileName}.xlsx`;
		_a.click();
	}

	key_handler(e){
		if(e.code !== 'Enter')
			return;

		if(document.activeElement === document.getElementById('input_user') || document.activeElement === document.getElementById('input_password'))
			return this.login();
		
		if(document.activeElement === document.getElementById('searchBox') && document.getElementById('searchBox').value.length > 0)
			return this.search();
	}

	selectListItem(_li, _text){
		document.querySelectorAll(_li).forEach(function(i){
			i.setAttribute('class', i.innerText.search(_text) > -1 ? 'selected' : '');
		});
	}

	openFloatingWin(_elem, _conInx = 0){
		this.replaceClass(document.querySelectorAll('.floating')[_conInx], 'off', 'on');
		ReactDOM.render(_elem, document.querySelectorAll(".bodyContainer.floating")[_conInx]);
	}

	closeFloatingWin(_conInx = 0){
		this.replaceClass(document.querySelectorAll('.floating')[_conInx], 'on', 'off');
		ReactDOM.unmountComponentAtNode( document.querySelectorAll(".bodyContainer.floating")[_conInx] );
	}

	openPopup = (_id) => {
		const _te = document.getElementById(_id);
		this.replaceClass(_te, 'off', 'on');
		let _tr = _te.getBoundingClientRect(),
			mouseTarget = { top:_tr.top, left:_tr.left, right:_tr.right, bottom:_tr.bottom },
			onMouseOut_handler = (e) => {
				try{
					if(mouseTarget.left > e.clientX || mouseTarget.right < e.clientX || mouseTarget.top > e.clientY || mouseTarget.bottom < e.clientY){
						this.replaceClass(_te, 'on', 'off');
						mouseTarget = null;
						_te.removeEventListener('mouseout', onMouseOut_handler);
					}
				}catch(e){}
			},
			onmouselick_handler = (e) => {
				this.replaceClass(_te, 'on', 'off');
				mouseTarget = null;
				_te.removeEventListener('click', onmouselick_handler);
			};
		_te.addEventListener('mouseout', onMouseOut_handler);
		_te.addEventListener('click', onmouselick_handler);
	}

	replaceClass(_e, _oc, _nc){
		this.removeClass(_e, _oc);
		this.addClass(_e, _nc);
	}

	addClass(_e, _c){
		if(_e === null || typeof _c === 'undefined' || _c.length === 0)
			return;
		var classes = _e.className.split(' '),
			inx = classes.indexOf(_c);
		if(inx > -1)
			return;
		classes.push(_c);
		_e.setAttribute('class', classes.join(' ').trim());
	}

	removeClass(_e, _c){
		if(_e === null || typeof _c === 'undefined' || _c.length === 0)
			return;
		var classes = _e.className.split(' ').filter(function(i) {
		    return i !== _c;
		});
		_e.setAttribute('class', classes.join(' '));
	}

	initLoading(_p){
		let e = document.createElement('div');
		e.setAttribute('class', 'circularLoading');
		e.innerHTML = `<svg className="" viewBox="0 0 50 50"><circle cx="25" cy="25" r="20" fill="none" stroke-width="2" stroke-miterlimit="10" /></svg>`;
		_p.appendChild(e);
	}

	removeLoading(_p){
		if(document.querySelector('.circularLoading') !== null){
			try{
				_p.removeChild(document.querySelector('.circularLoading'));
			}catch(e){
				document.querySelector('.circularLoading').parentNode.removeChild(document.querySelector('.circularLoading'));
			}

		}
	}


	render() {

		window.setTimeout( () => window.scroll(0, 0), 500);
		document.addEventListener('keydown', this.key_handler.bind(this));

	    return (
	      <div>
	        <header>
	          <div id="contents">
	            <div className="logo"></div>
	            <h1>Dynamic Video Service</h1>
	            <span id="userName" 
	            	onMouseOver={() => this.setState({LogoutVisible:true})}
	            >User Name</span>
	            <div id="userPicture"></div>
	            <div id="logoutBTN" 
	            	style={{ display: `${this.state.LogoutVisible ? 'inline-block' : 'none'}` }}
	            	onClick={this.logout.bind(this)}
	            	onMouseOut={() => this.setState({LogoutVisible:false})}
	            >Logout</div>
	          </div>
	        </header>

	        <div className="bodyContainer login">
	          <div className="loginBox">
	            <p className="element">Log in</p>
	            <div className="element error">Incorrect username or password.</div>
	            <input id="input_user" className="element" type="text" placeholder="user name" value=""></input>
	            <input id="input_password" className="element" type="password" placeholder="password" value=""></input>
	            <button id="loginBTN" onClick={() => this.login()} className="element btn medium orangeBTN">Next</button>
	          </div>

	          <div className="loginBox">
	            <p className="element">Change Password</p>
	            <div className="description">
	              A password should be longer than 8 letters and containing at least one of upper-letters, lower-letters, numbers and special characters.
	            </div>
	            <div className="element error">New passwords are not matched to password criteria.</div>
	            <input id="input_new" className="element" type="password" placeholder="Your new password"></input>
	            <input id="input_duplicate" className="element" type="password" placeholder="Type here again"></input>
	            <button id="changeBTN" className="element btn medium orangeBTN">Change your password</button>
	          </div>
	        </div>

	        <div className="bodyContainer team">
	          <div id="teamContainer">
	            <div className="team_unit dummy"></div>
	            <div className="team_unit dummy"></div>
	            <div className="team_unit dummy"></div>
	            <div className="team_unit dummy"></div>
	            <div className="team_unit dummy"></div>
	            <div className="team_unit dummy"></div>
	          </div>
	        </div>

	        <div className="bodyContainer list">
	          <div id="listContainer">
	            <div id="listHeader">
	              <h1></h1><a id="backToTitleBTN" onClick={() => {this.replaceClass(document.getElementsByTagName('body')[0], 'navi', 'title')}}>Back to choose other teams</a>
	            </div>
	            <div id="listFilters">
	              <div className="searchGroup">
	                <input id="searchBox" className="filterField" type="search" placeholder="Search"></input><button onClick={this.search} ></button>
	              </div>
	              <div id="dateBTN" onClick={()=> this.openPopup('dateOptions')} className="dropdownGroup">
	                <p className="dropdownField">Date</p><p className="dropdownBTN"></p>
	                <ul id="dateOptions" className="dropdownOptions off">
	                  <li onClick={()=> this.sortingByDate('newToLate')}><span className="radioBTN"></span>Newest to Latest</li>
	                  <li onClick={()=> this.sortingByDate('lateToNew')}><span className="radioBTN"></span>Latest to Newest</li>
	                </ul>
	              </div>
	              <div id="userBTN" onClick={()=> this.openPopup('userOptions')} className="dropdownGroup">
	                <p className="dropdownField">Category</p><p className="dropdownBTN"></p>
	                <ul id="userOptions" className="dropdownOptions off"></ul>
	              </div>
	              Sort By :
	              <div style={{clear:'both'}}></div>

	            </div>
	            <div id="listTable">
	              <table>
		              <thead>
		                <tr>
		                  <th className="blueText">Project Name</th>
		                  <th className="blueText">Updated Date</th>
		                  <th className="blueText">Category</th>
		                  <th className="blueText">Status</th>
		                  <th></th>
		                </tr>
		              </thead>
		              <tbody></tbody>
		            </table>
	            </div>
	            <div id="listNumbering">
	              <ul>
	                <li onClick={() => this.paging("prev")}></li>
	                <li onClick={() => this.paging(1)}>1</li>
	                <li onClick={() => this.paging(2)}>2</li>
	                <li onClick={() => this.paging(3)}>3</li>
	                <li onClick={() => this.paging(4)}>4</li>
	                <li onClick={() => this.paging(5)}>5</li>
	                <li onClick={() => this.paging(6)}>6</li>
	                <li onClick={() => this.paging(7)}>7</li>
	                <li onClick={() => this.paging(8)}>8</li>
	                <li onClick={() => this.paging(9)}>9</li>
	                <li onClick={() => this.paging(10)}>10</li>
	                <li onClick={() => this.paging("next")}></li>
	              </ul>
	            </div>
	          </div>
	        </div>
	        <footer>Dynamic Video Service (DVS), Amazon Confidential, ©2021</footer>
	        <div className="bodyContainer floating off" style={{backgroundColor:'rgba(0,0,0,0.8)'}}></div>
	        <div className="bodyContainer floating off"></div>
	      </div>
	    );
	}
}

export default App;
