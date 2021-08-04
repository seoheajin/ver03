import React from 'react';


export class ProjectHistory extends React.Component {

	constructor(props){
		super(props);
	    this.handleClick = this.handleClick.bind(this);
	}

	handleClick(_id){
		switch(_id){
			case 'close':
				this.props.callback('close');
				break;
			case 'sorting':
				if(document.querySelector('#batchHistory table tbody').children.length > 0)
					this.props.callback('filter');
				break;
			default:
				document.querySelectorAll('#batchOptions li').forEach((i) => {
					i.setAttribute('class', i.innerText.search(_id) > -1 ? 'selected' : '');
				});
				this.props.callback(_id);
				break;
		}
	}

	render(){
		return (
			<div id="batchHistory" className="floatingWindow">
			<div className="floatingHeader">
				<h2>{this.props.data}</h2>
			</div>
			<table>
				  <thead>
				    <tr>
				      <th className="blueText">Id</th>
				      <th className="blueText">Created Date</th>
				      <th className="blueText">Rendered</th>
				      <th className="blueText">Published</th>
				      <th className="blueText">
			      		<p onClick={() => {this.handleClick("sorting")}}>Status</p>
						<ul id="batchOptions" className="dropdownOptions off">
							<li onClick={() => {this.handleClick("All")}}><span className="radioBTN"></span>All</li>
							<li onClick={() => {this.handleClick("Preparing")}}><span className="radioBTN"></span>Preparing</li>
							<li onClick={() => {this.handleClick("Publishing")}}><span className="radioBTN"></span>Publishing</li>
							<li onClick={() => {this.handleClick("Error")}}><span className="radioBTN"></span>Error</li>
						</ul>
				      </th>
				    </tr>
				  </thead>
				  <tbody>
				  	<div className="circularLoading">
				  		<svg className="" viewBox="0 0 50 50"><circle cx="25" cy="25" r="20" fill="none" stroke-width="2" stroke-miterlimit="10" /></svg>
				  	</div>
				  </tbody>
			</table>
			<div className="closeBTN" onClick={() => {this.handleClick("close")}}></div>
		</div>
		)
	}
}


export class BatchLine {

	constructor(prop, callback){
		this.prop = prop;
		this.callback = callback;
		this.render();
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
		let tr = document.createElement('tr');
		if(typeof this.prop === 'string'){
			tr.setAttribute('class', 'termanted');
			let td_message = document.createElement('td');
			td_message.innerHTML = this.prop;
			tr.appendChild(td_message);
		}else{
			tr.setAttribute('status', this.prop.status.split('_')[0]);
			tr.setAttribute('class', ('ERROR_INPUT FAILED'.search(this.prop.status) > -1 ? 'termanted' : ''));

			let td_id = document.createElement('td');
			let a_id = document.createElement('a');
			a_id.innerHTML = this.prop.id;
			a_id.addEventListener('click', (e) => this.callback(this.prop.id));
			td_id.appendChild(a_id);
			tr.appendChild(td_id);

			let td_date = document.createElement('td');
			td_date.innerHTML = this.dateMapping(this.prop.date);
			tr.appendChild(td_date);

			let td_rendered = document.createElement('td');
			td_rendered.innerHTML = this.prop.rendered;
			tr.appendChild(td_rendered);

			let td_published = document.createElement('td');
			td_published.innerHTML = this.prop.published;
			tr.appendChild(td_published);

			let td_status = document.createElement('td');
			td_status.innerHTML = this.prop.status.split('_')[0];
			tr.appendChild(td_status);
		}
		document.querySelector('#batchHistory table tbody').appendChild(tr);
	}

}
