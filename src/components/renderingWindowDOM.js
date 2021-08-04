import React from 'react';
import XLSX from 'xlsx';

export class RenderingWindow extends React.Component {

	constructor(props){
	    super(props);
	    this.handleClick = this.handleClick.bind(this);
	    this.batch = [];
	    this.customFFmpegOptions = [
			{ "name":"c:v", "value":"libx264" },
			{ "name":"c:a", "value":"aac" },
			{ "name":"b:v", "value":"1000k" },
	    	{ "name":"b:a", "value":"192k" },
			{ "name": "minrate", "value": "20M" },
			{ "name": "maxrate", "value": "25M" },
			{ "name": "r", "value": "23.98" },
			{ "name": "bufsize", "value": "20M" },
			{ "name": "x264-params", "value": "nal-hrd=cbr:force-cfr=1" },
			{ "name": "vf", "value": "yuv420p" },
			{ "name": "profile:v", "value": "main" }
		];
		this.params = {
			"format": "MP4",
			"width": 1920,
			"height": 1080,
			"resizeStrategy": "FIT"
		};
	 }

	handleClick(_id){
		switch(_id){
			case 'close':
				this.props.callback('close');
				break;
			case 'batch':
				document.getElementById('verifying').classList.add("off");
				//document.getElementById("defaultSetting").classList.add("off");
				let reader = new FileReader();
				reader.readAsBinaryString(document.getElementById('csvFile').files[0]);
				reader.onload = function (e) {
					var data = e.target.result;
			        let readedData = XLSX.read(data, {type: 'binary'});

			        if(readedData.SheetNames.length > 1){
			        	const prData = readedData.Sheets[readedData.SheetNames[0]];
			        	const prParse = XLSX.utils.sheet_to_json(prData, {header:1});

			        	for(let l = 0; l < prParse[0].length; l++){
			        		let _lable = prParse[0][l].toLowerCase().replace('strategy', '');

			        		if(typeof prParse[1][l].length === 0 || document.getElementById(`${_lable}_input`) === null)
			        			continue;

			        		if(document.getElementById(`${_lable}_input`).tagName == 'P')
								document.getElementById(`${_lable}_input`).innerHTML = prParse[1][l];
							else
								document.getElementById(`${_lable}_input`).value = prParse[1][l];

			        		this.params[_lable] = isNaN(prParse[1][l]) ? prParse[1][l] : parseInt(prParse[1][l]);
			        	}
			        }

			        const wsname = readedData.SheetNames[readedData.SheetNames.length-1];
			        const ws = readedData.Sheets[wsname];
			        const dataParse = XLSX.utils.sheet_to_json(ws, {header:1});
			        const properties = dataParse[0];
			        this.varifyingBatch(properties);

			        let _obj;
			        this.batch = [];
			        for(let i = 1; i < dataParse.length; i++){
			        	_obj = {};
			        	for(let j = 0; j < properties.length; j++){
			        		(typeof dataParse[i][j] !== 'undefined' && dataParse[i][j].length > 0) && (_obj[properties[j]] = dataParse[i][j]);
			        	}
			        	(Object.getOwnPropertyNames(_obj).length > 0) && this.batch.push(_obj);
			        }
			        document.querySelector('.grid-2.right.outputSetting').classList.remove("off");
			    }.bind(this);
				break;
			case 'test':
				this.props.callback('testRender', this.createPreset(true));
				break;
			case 'Render':
				this.props.callback('render', {id:this.props.data.projectId, queue:this.createPreset(), customFFmpegOptions:this.customFFmpegOptions});
				break;
			default:
				console.log('doing somthing else');
				break;
		}
	}

	varifyingBatch(_input){
		let children = '', lables = [];
		try{
			const _p = this.props.data.manifest.defaultContentTemplateInput;
			let _v = 'correct', _c;
			for(let j = 0; j < _input.length; j++){
				if('RenderId Output PosterOutput'.search(_input[j]) > -1)
					continue;

				if(_input[j].search(/\./g) == -1){
					if(typeof _p[_input[j]] === 'undefined'){
						_c = 'incorrect';
						(_v === 'correct') && (_v = 'incorrect');
					}else{
						_c = 'correct';
						lables.push(_input[j]);
					}
					children += `<li class="${_c}">${_input[j]}</li>`;
				}else{
					let _r = _input[j].split('.');
					if(typeof _p[_r[0]] === 'undefined' || typeof _p[_r[0]][_r[1]] === 'undefined'){
						_c = 'incorrect';
						(_v === 'correct') && (_v = 'incorrect');
					}else{
						_c = 'correct';
						lables.push(_input[j]);
					}
					children += `<li class="${_c}">${_input[j]}</li>`;
				}
			}
			(lables.length == 0) && (_v = 'incorrect');
			if(_v === 'correct'){
				this.setDefaultRender(lables);
				document.querySelector('.btn.big.orangeBTN').style.display = 'inline-block';
			}else{
				document.querySelector('.btn.big.orangeBTN').style.display = 'none';
			}
			children += `<li class="${_v}">${_v === 'correct' ? 'Verified All' : 'The batch data is invalid'}</li>`;
		}catch(e){
			children += '<li class="incorrect">This project doesn\'t have dynamic elements.</li>';
		}
		document.querySelector('#verifying ul').innerHTML = children;
		document.getElementById('verifying').classList.remove("off");
	}

	setDefaultRender(_lables){
		let html = '<li><p>Default Setting</p></li>';
		const inputs = this.props.data.manifest.defaultContentTemplateInput;
		_lables.forEach( e => {
			html += `<li>
						<span class="grid-2">${e}</span>
						<input class="dropdownField" type="text" placeholder="${inputs[e]}" />
					</li>`;
		});
		document.querySelector('#defaultSetting ul').innerHTML = html;
		//document.getElementById('defaultSetting').classList.remove("off");
	}

	createPreset(_isTest){
		let _r = {};
		for(let p in this.params)
			_r[p] = this.params[p];
		_r['input'] = _isTest ? this.props.data.manifest.defaultContentTemplateInput : this.batch;
		_r['input'].name = _isTest ? "test_render" : "";
		_r['s3KeySuffixOverride'] = `-${(_isTest ? "testRender" : "")}-${this.props.data['projectId']}-${this.props.data['stagingVersion']}`;
		_r['memo'] = _isTest ? "test render" : "";
		_r['title'] = this.props.data.displayName;
		_r['batchName'] = document.getElementById('csvFile').value;
		_r['strictMode'] = false;
		return [_r];
	}

	outputSetting_click(_id, _var){
		switch(_id){
			case 'advancedOptions':
				const _advancedOptions = document.getElementsByClassName('advancedOption');
				for(let i = 0; i< _advancedOptions.length; i++){
					if(_advancedOptions[i].className.indexOf('off') == -1)
						_advancedOptions[i].classList.add('off');
					else
						_advancedOptions[i].classList.remove('off');
				}
				document.querySelector('.outputSetting div').classList.add('settingList');
				break;
			case 'customOptions':
				if(document.querySelector('.outputSetting div').className.indexOf('customOption_activated') == -1){
					document.querySelector('.outputSetting div').classList.add('customOption_activated');
					document.getElementById('advancedTextarea').value = JSON.stringify(this.customFFmpegOptions)
																			.replace(/\{\"/g, '\n\t\{\n\t\t\"')
																			.replace(/\",\"/g, '\",\n\t\t\"')
																			.replace(/\},/g, '\n\t\},')
																			.replace(/\"\}\]/g, '\"\n\t\}\n\]');
				}else{
					document.querySelector('.outputSetting div ul').style.marginTop = '0';
					window.setTimeout(() => {
						document.querySelector('.outputSetting div').classList.remove('customOption_activated');
						document.querySelector('.outputSetting div ul').setAttribute('style', '');
					}, 500);
					try{
						let _v = document.getElementById('advancedTextarea').value.replace(/\n|\t/g, '');
						this.customFFmpegOptions = JSON.parse(_v);
						for(let i=0; i < this.customFFmpegOptions.length; i++){
							if("bufsize x264-params vf profile:v".search(this.customFFmpegOptions[i].name) > -1)
								continue;
							if(typeof this.customFFmpegOptions[i].value === 'undefined' || this.customFFmpegOptions[i].value.length === 0)
								continue;
							let id = (this.customFFmpegOptions[i].name.search('rate') == -1) ? `${this.customFFmpegOptions[i].name.replace(':', '')}_input` : `${this.customFFmpegOptions[i].name.slice(0, 3)}_input`;
							if(document.getElementById(id).tagName == 'P')
								document.getElementById(id).innerHTML = this.customFFmpegOptions[i].value;
							else
								document.getElementById(id).value = this.customFFmpegOptions[i].value;
						}
					}catch(e){
						console.log(e);
					}
				}
				break;
			default:
				if(typeof _var === 'undefined')
					_var = document.getElementById(_id).value;
				else
					document.getElementById(_id).innerHTML = _var;

				for(let j = 0; j < this.customFFmpegOptions.length; j++){
					let id = (this.customFFmpegOptions[j].name.search('rate') == -1) ? `${this.customFFmpegOptions[j].name.replace(':', '')}_input` : `${this.customFFmpegOptions[j].name.slice(0, 3)}_input`;
					if(id === _id){
						this.customFFmpegOptions[j].value = _var;
						break;
					}
				}
				for(let p in this.params){
					if(_id.replace('_input', '') === p.toLowerCase().replace('strategy', '')){
						this.params[p] = isNaN(_var) ? _var : parseInt(_var);
						break;
					}
				}
				break;
		}

	}

	render(){
		return (
			<div id="renderingWindow" className="floatingWindow">
				<h2 className="title">{this.props.data.displayName}</h2>
				<div className="grid-2 left renderSetting">
					<h3>Rendering Setting</h3>
					<input id="csvFile" type="file" onChange={(e) => this.handleClick('batch')} accept=".xls,.xlsx,.csv" />
					<div id="verifying" className="textBox greyBox off" style={{opacity:'1'}}>
						<ul></ul>
					</div>
					<div id="defaultSetting" className="textBox blueBox" style={{opacity:'1'}}>
						<ul></ul>
						<button className="btn medium blueBTN" onClick={()=>{this.handleClick("test")}}>Test Render</button>
					</div>
				</div>

				<div className="grid-2 right outputSetting off">
					<h3>Output Setting</h3>
					<div>
					<ul>
						<li>
							<span className="grid-1">Format</span>
							<div id="format_group" className="dropdownGroup" onClick={() => {this.props.callback("format")}}>
								<p id="format_input" className="dropdownField">Mp4</p><p className="dropdownBTN"></p>
								<ul id="formatOptions" className="dropdownOptions off">
									<li onClick={() => {this.outputSetting_click("format_input","mp4")}}>mp4</li>
									<li onClick={() => {this.outputSetting_click("format_input","webm")}}>webm</li>
								</ul>
							</div>
						</li>
						<li id="size_input" >
							<span className="grid-1">Size</span>
							<input id="width_input" type="text" placeholder="width" onBlur={()=>{this.outputSetting_click("width_input")}} /><span>px</span> X
							<input id="height_input" type="text" placeholder="height" onBlur={()=>{this.outputSetting_click("height_input")}} /><span>px</span>
						</li>
						<li>
							<span className="grid-3">Resize Options</span>
							<div id="resize_group" className="dropdownGroup" onClick={() => {this.props.callback("resize")}}>
								<p id="resize_input" className="dropdownField">Fitted</p><p className="dropdownBTN"></p>
								<ul id="resizeOptions" className="dropdownOptions off">
									<li onClick={() => {this.outputSetting_click("resize_input","Fitted")}}>Fitted</li>
									<li onClick={() => {this.outputSetting_click("resize_input","Stretch")}}>Stretch</li>
									<li onClick={() => {this.outputSetting_click("resize_input","Zoom")}}>Zoom</li>
								</ul>
							</div>
						</li>
						<li style={{paddingTop:'1rem'}}>
							<a onClick={() => {this.outputSetting_click("advancedOptions")}}>Advanced Options</a>
						</li>
						<li className="advancedOption off">
							<span className="grid-2">Video Codec</span>
							<div id="cv_group" className="dropdownGroup" onClick={() => {this.props.callback("cv")}}>
								<p id="cv_input" className="dropdownField">libx264</p><p className="dropdownBTN"></p>
								<ul id="cvOptions" className="dropdownOptions off">
									<li onClick={() => {this.outputSetting_click("cv_input","libx264")}}>libx264</li>
									<li onClick={() => {this.outputSetting_click("cv_input","mpeg2")}}>mpeg2</li>
									<li onClick={() => {this.outputSetting_click("cv_input","vp8")}}>vp8</li>
									<li onClick={() => {this.outputSetting_click("cv_input","vp9")}}>vp9</li>
								</ul>
							</div>
						</li>
						<li className="advancedOption off">
							<span className="grid-2">Audio Codec</span>
							<div id="ca_group" className="dropdownGroup" onClick={() => {this.props.callback("ca")}}>
								<p id="ca_input" className="dropdownField">AAC</p><p className="dropdownBTN"></p>
								<ul id="caOptions" className="dropdownOptions off">
									<li onClick={() => {this.outputSetting_click("ca_input","AAC")}}>AAC</li>
									<li onClick={() => {this.outputSetting_click("ca_input","flac")}}>flac</li>
									<li onClick={() => {this.outputSetting_click("ca_input","mp2")}}>mp2</li>
									<li onClick={() => {this.outputSetting_click("ca_input","pcm")}}>pcm</li>
									<li onClick={() => {this.outputSetting_click("ca_input","vorbis")}}>vorbis</li>
								</ul>
							</div>
						</li>
						<li className="advancedOption off">
							<span className="grid-2">Video Bitrate</span>
							<input id="bv_input" type="text" placeholder="1000kb" onBlur={()=>{this.outputSetting_click("bv_input")}} />

							<span className="grid-2">Audio Bitrate</span>
							<input id="ba_input" type="text" placeholder="128kb" onBlur={()=>{this.outputSetting_click("ba_input")}} />
						</li>
						<li className="advancedOption off">
							<span className="grid-2">Max Bitrate</span>
							<input id="max_input" type="text" placeholder="1200kb" onBlur={()=>{this.outputSetting_click("max_input")}} />

							<span className="grid-2">Min Bitrate</span>
							<input id="min_input" type="text" placeholder="800kb" onBlur={()=>{this.outputSetting_click("min_input")}} />
						</li>
						<li className="advancedOption off">
							<span className="grid-2">Frame Rate</span>
							<input id="r_input" type="text" placeholder="23.98" onBlur={()=>{this.outputSetting_click("r_input")}} />
						</li>
						<li className="advancedOption customOption off" onClick={() => {this.outputSetting_click("customOptions")}}>
							Custom Options<span className="radioBTN"></span>
						</li>
						<li>
							<textarea id="advancedTextarea"></textarea>
						</li>
					</ul>
					</div>
				</div>
				<div style={{clear:"both"}}></div>
				<div className="buttonGroup">
					<button className="btn big orangeBTN" style={{display:"none"}} onClick={() => {this.handleClick("Render")}}>Render This Batch</button>
				</div>
				<div className="closeBTN" onClick={() => {this.handleClick("close")}}></div>
			</div>
		)
	}
}
