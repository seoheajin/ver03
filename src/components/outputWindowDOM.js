import React from 'react';
import XLSX from 'xlsx';

export class OutputWindow extends React.Component {

	constructor(props) {
	    super(props);
	    this.handleClick = this.handleClick.bind(this);
	    this.csv = [];
	 }

	handleClick(_id){
		switch(_id){
			case 'close':
				this.props.callback('close');
				break;
			case 'CSV':
				this.downloadCSV();
				break;
			default:
				console.log('download video');
				break;
		}
	}

	downloadCSV(){
		let wb = XLSX.utils.book_new();
		let output_sheet = XLSX.utils.json_to_sheet(this.csv);
		XLSX.utils.book_append_sheet(wb, output_sheet, "Output");

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
		_a.download = `output-${this.props.data.name}-${this.props.data.category}.xlsx`;
		_a.click();
	}

	render(){
		const dateMapping = (v) => {
			let t = new Date(v),
				m = t.getMonth()+1,
				d = t.getDate(),
				y = t.getFullYear();
			return (m < 10 ? '0' : '')+m+'/'+d+'/'+(y < 10 ? '0' : '')+y;
		}

		const aList = this.props.data.videos.map((p) => {
			let key = '...'+p.Key.slice(p.Key.length-90, p.Key.length);
			this.csv.push({ "Output": p.Key, "Date":dateMapping(p.LastModified) });

			return (
				 <li>
			      <p onClick={() => {this.handleClick("mp4")}}>{key}</p>
			      <p>{dateMapping(p.LastModified)}</p>
			    </li>
			)
		});

		return (
			<div id="outputWindow" className="floatingWindow">
				<div className="floatingHeader">
					<h2>{this.props.data.name}</h2>
					<p className="floatingHeader">in <span>{this.props.data.category}</span></p>
					<button className="btn medium blueBTN" onClick={() => {this.handleClick("CSV")}}>Download CSV</button>
				</div>

				<ul className="floatingTable head">
					<li>
						<p className="blueText">Name</p><p className="blueText">Date</p>
					</li>
				</ul>
				<ul className="floatingTable list">{aList}</ul>
				<div className="closeBTN" onClick={() => {this.handleClick("close")}}></div>
			</div>
		)
	}
}
