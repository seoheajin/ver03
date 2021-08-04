import React from 'react';


export class ProjectPublish extends React.Component {

	constructor(props){
		super(props);
	    this.handleClick = this.handleClick.bind(this);
	    this.videosToPublish = [];
	}

	handleClick(_id){
		//console.log(_id);
		switch(_id){
			case 'close':
				this.props.callback('close');
				break;
			case 'CSV':
				this.props.callback('CSV', this.props.data);
				break;
			case 'publish':
				let selectedVideos = [];
				this.videosToPublish.forEach(v => selectedVideos.push(this.props.data.videos[v]));
				this.props.callback('publish', selectedVideos);
				break;
			case 'all':
				let head_class = document.querySelector('#videoList .head li:first-child').getAttribute('class');
				this.videosToPublish = [];
				if(head_class === 'selected'){
					document.querySelector('#videoList .head li:first-child').setAttribute('class', '');
					document.querySelectorAll('#videoList table tbody tr').forEach((tr, i) => {
						if(tr.getAttribute('class') !== 'Published' && tr.getAttribute('class') !== 'publishing')
							tr.setAttribute('class', '');
					});
				}else{
					document.querySelector('#videoList .head li:first-child').setAttribute('class', 'selected');
					document.querySelectorAll('#videoList table tbody tr').forEach((tr, i) => {
						if(tr.getAttribute('class') !== 'Published' && tr.getAttribute('class') !== 'publishing'){
							tr.setAttribute('class', 'selected');
							this.videosToPublish.push(i);
						}
					});
				}
				document.querySelector('#videoList .btn.medium.orangeBTN').innerHTML = `Publish ${this.videosToPublish.length} Videos`;
				break;
			default:
				let _class = document.querySelectorAll('#videoList table tbody tr')[_id].getAttribute('class');
				if(_class === 'selected'){
					document.querySelectorAll('#videoList table tbody tr')[_id].setAttribute('class', '');
					this.videosToPublish.splice(this.videosToPublish.indexOf(_id), 1);
				}else if(_class.length === 0){
				  document.querySelectorAll('#videoList table tbody tr')[_id].setAttribute('class', 'selected');
				  this.videosToPublish.push(_id);
				}
				document.querySelector('#videoList .btn.medium.orangeBTN').innerHTML = `Publish ${this.videosToPublish.length} Videos`;
				break;
		}
	}

	dateMapping = (v) => {
		let t = new Date(v),
			m = t.getMonth()+1,
			d = t.getDate(),
			y = t.getFullYear(),
			h = t.getHours(),
			u = t.getMinutes();
		return (m < 10 ? '0' : '')+m+'/'+(d < 10 ? '0' : '')+d+'/'+y+' '+(h < 10 ? '0'+h : h)+ ':' +(u < 10 ? '0'+u : u)+' '+(h < 13 ? 'AM' : 'PM');
	}

	render(){

		const getFileName = (p) => {
			let ts = p.published ? p.publishedUrl : p.previewUrl;
			return ts.slice(ts.length - 60, ts.length);
		}

		const getBatchStatus = () => {
			if(typeof this.props.data.videos === 'undefined')
				return this.props.data.status;

			if(this.props.data.videos.length === this.props.data.published)
				return '100% Published';

			if(this.props.data.videos.length === this.props.data.rendered){
				if(this.props.data.published === 0)
					return 'Ready to Publish';
				else
					return `${parseInt(this.props.data.published/this.props.data.rendered * 100)}% Published`;
			}
			return `${parseInt(this.props.data.rendered/this.props.data.videos.length * 100)}% Rendered`;
		}

		const getVideoStatus = (p) => {
			if(p.published)
				return 'Published';
			if(p.previewUrl.length > 0)
				return 'Previewing';
			return p.renderStatus;
		}

		let videoList;
		if(typeof this.props.data.videos !== 'undefined' && this.props.data.videos.length > 0){
			videoList = this.props.data.videos.map((p, i) =>
				<tr class={getVideoStatus(p)}>
				  <td><span className="radioBTN" onClick={() => {this.handleClick(i)}}></span></td>
				  <td>{i+1}</td>
				  <td><a href={(p.published ? p.publishedUrl : p.previewUrl)} target="_blank">
				  	{getFileName(p)}
				  </a></td>
				  <td>{getVideoStatus(p)}</td>
				  <td><button className="latestBTN" type="button">PUBLISH</button></td>
				</tr>
			);
		}else{
			videoList = <tr class='{getBatchStatus()}'>
				  <td></td>
				  <td></td>
				  <td>Working in progress</td>
				  <td>{getBatchStatus()}</td>
				  <td></td>
				</tr>;
		}

		return (
			<div>
				<div id="batchPublish" className="floatingWindow">
					<div className="floatingHeader">
						<h2>{this.props.head}</h2>
					</div>
					<div className="batchStatus">
						<div><p>Batch Id</p><p>{this.props.data.id}</p></div>
						<div><p>Created At</p><p>{this.dateMapping(this.props.data.date)}</p></div>
						<div><p>Status</p><p>{getBatchStatus()}</p></div>
						<div><p>Video Num</p><p>{(typeof this.props.data.videos === 'undefined' ? 'N/A' : this.props.data.videos.length)}</p></div>
					</div>
					<div className="closeBTN" onClick={() => {this.handleClick("close")}}></div>
				</div>

				<div id="videoList" className="floatingTable">
					<ul class={(typeof this.props.data.videos !== 'undefined' && this.props.data.published === this.props.data.videos.length ? 'head Published' : 'head')}>
						<li>All<br /><span className="radioBTN" onClick={() => {this.handleClick("all")}}></span></li>
						<li>
							<button className="btn medium blueBTN" onClick={() => {this.handleClick("CSV")}}>Download Video List</button>
							<button className="btn medium orangeBTN" onClick={() => {this.handleClick("publish")}}>Publish 00 Videos</button>
						</li>
					</ul>
					<table>
						<tbody>{videoList}</tbody>
					</table>
				</div>
			</div>
		)
	}
}
