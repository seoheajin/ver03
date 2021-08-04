import React from 'react';


export class ProjectUnits extends React.Component {

	render(){
		const projectList = this.props.data.map((p, i) =>
			<div className="team_unit" style={{'animationDelay':String(i*0.1)+'s'}} onClick={() => {this.props.callback(p)}}>
				<p>{p.name}</p>
				<p>
					- {p.projectNum} projects <br />
					- {p.categories.length} categories
				</p>
				<div className="btn big greyBTN">Select</div>
			</div>
		  );

		return (
			<div id="teamContainer">{projectList}</div>
		)
	}
}
