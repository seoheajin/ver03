import React from 'react';


export class ProjectList {

	constructor(prop, callback){
		this.prop = prop;
		this.callback = callback;
	  this.getElement = this.createElement();
	}

	dateMapping = (v) => {
		let t = new Date(v),
			m = t.getMonth()+1,
			d = t.getDate(),
			y = t.getFullYear();
		return (m < 10 ? '0' : '')+m+'/'+(d < 10 ? '0' : '')+d+'/'+y;
	}

	get element(){
		return this.getElement;
	}

	createElement(){
		let elem = document.createElement('tr');
		elem.setAttribute('id', `project-${this.prop.id}`);
		elem.setAttribute('name', this.prop.name);
		elem.setAttribute('date', this.prop.updatedAt);
		elem.setAttribute('category', this.prop.category);
		elem.appendChild(this.getNewShell(this.prop.name));
		elem.appendChild(this.getNewShell(this.dateMapping(this.prop.updatedAt)));
		elem.appendChild(this.getNewShell(this.prop.category));
		elem.appendChild(this.getNewShell(''));
		let buttonShell = document.createElement('td');
		buttonShell.appendChild( this.getNewButton('BATCH TEMPLATE') );
		buttonShell.appendChild( this.getNewButton('RENDER') );
		buttonShell.appendChild( this.getNewButton('HISTORY') );
		buttonShell.appendChild( this.getNewButton('PUBLISH') );
		elem.appendChild(buttonShell);
		return elem;
	}

	getNewShell(_html){
		let _td = document.createElement('td');
		_td.innerHTML = _html;
		return _td;
	}

	getNewButton(_html, _class){
		let _btn = document.createElement('button');
		_btn.setAttribute('type', 'button');
		_btn.setAttribute('className', _class);
		_btn.innerHTML = _html;
		_btn.addEventListener('click', () => {
			this.callback(_html, this.prop.id);
		});
		return _btn;
	}

}

