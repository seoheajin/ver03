import React from 'react';

export class RenderingSummery extends React.Component {

	constructor(props){
	    super(props);
	    this.handleClick = this.handleClick.bind(this);
	 }

	handleClick(_id){
		switch(_id){
			case 'close':
				this.props.callback('close');
				break;
			case 'Render':
				this.props.callback('render', this.props.data);
				break;
		}
	}

	render(){
		const _queue = this.props.data.queue[0],
			  _FFmpeg = this.props.data.customFFmpegOptions,
			  _optionLabels = {
				"r":"Frame Rate",
				"minrate":"Minimum Bitrate",
				"maxrate":"Maximum Bitrate",
				"c:v":"Video Codec",
				"b:v":"Video Bitrate",
				"c:a":"Audio Codec",
				"b:a":"Audio Bitrate"
			};

		let ffmpeg_options = [
				{name: "Format", value: _queue.format},
				{name: "Size", value: `${_queue.width}X${_queue.height}`},
				{name: "Resize Options", value: _queue.resizeStrategy}
			],
			dynamicInput_list = [];

		for(let p in _queue.input[0]){
			('RenderId Output PosterOutput'.search(p) == -1) && dynamicInput_list.push(p);
		};
		const dynamicInputs = dynamicInput_list.map( (j) => {
			return ( <span>{j} </span> )
		});

		for(let i = 0; i < _FFmpeg.length; i++){
			let _label = _optionLabels[_FFmpeg[i].name] || _FFmpeg[i].name;
			ffmpeg_options.push({name: _label, value: _FFmpeg[i].value});
		}
		const ffmpeg_list = ffmpeg_options.map((p) => {
			return (
				<div>
					<p className="blueText">{p.name}</p><p>{p.value}</p>
				</div>
			)
		});

		return (
			<div id="renderingSummery" className="floatingWindow">
				<h2 className="title">Batch Summery</h2>
				<div className="summeryList left">
					<div>
						<p className="blueText">Project name</p><p>{_queue.title}</p>
					</div>
					<div>
						<p className="blueText">Batch file</p><p>{_queue.batchName}</p>
					</div>
					<div>
						<p className="blueText">Dynamic Inputs</p><p>{dynamicInputs}</p>
					</div>
					<div>
						<p className="blueText">A Number of videos</p><p>{_queue.input.length}</p>
					</div>
				</div>
				<div className="summeryList right">
					{ffmpeg_list}
				</div>
				<div style={{clear:"both"}}></div>
				<div className="buttonGroup">
					<button className="btn big greyBTN" onClick={() => {this.handleClick("close")}}>Back to Setup</button>
					<button className="btn big orangeBTN" onClick={() => {this.handleClick("Render")}}>Process This Batch</button>
				</div>
			</div>
		)
	}
}
