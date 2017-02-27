/*******************************************************************************
 *
 * Copyright (c) 2011, 2016 OpenWorm.
 * http://openworm.org
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the MIT License
 * which accompanies this distribution, and is available at
 * http://opensource.org/licenses/MIT
 *
 * Contributors:
 *      OpenWorm - http://openworm.org/people.html
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
 * USE OR OTHER DEALINGS IN THE SOFTWARE.
 *******************************************************************************/

define(function (require) {

	return function (GEPPETTO) {

		var React = require('react');
		var ReactDOM = require('react-dom');
		var spinner=require('./loadingSpinner/LoadingSpinner.js');		

		//All the components potentially instantiable go here
		var components = {
			'FORM':'form/Form',
			'PANEL':'panel/Panel',
			'LOGO':'logo/Logo',
			'LOADINGSPINNER':'loadingSpinner/LoadingSpinner',
			'SAVECONTROL':'save/SaveControl',
			'TOGGLEBUTTON' : 'toggleButton/ToggleButton',
			'CONTROLPANEL':'controlPanel/controlpanel',
			'SPOTLIGHT':'spotlight/spotlight',
			'MENUBUTTON':'menuButton/MenuButton',
			'FOREGROUND':'foregroundControls/ForegroundControls',
			'EXPERIMENTSTABLE':'experimentsTable/ExperimentsTable',
			'HOME':'home/HomeControl',
			'SIMULATIONCONTROLS':'simulationControls/ExperimentControls',
			'CAMERACONTROLS': 'cameraControls/CameraControls',
			'SHARE':'share/share',
			'INFOMODAL':'modals/InfoModal',
			'MDMODAL':'modals/MarkDownModal',
			'QUERY':'query/query',
			'TUTORIAL':'tutorial/TutorialModule',
			'PYTHONCONSOLE': 'pythonConsole/PythonConsole',
			'CHECKBOX': 'basicComponents/Checkbox',
			'TEXTFIELD': 'basicComponents/TextField',
			'RAISEDBUTTON': 'basicComponents/RaisedButton'
		}
		
	
		GEPPETTO.ComponentFactory = {
				
			loadSpinner:function(){
				//We require this synchronously to properly show spinner when loading projects
				this.renderComponent(React.createFactory(spinner)(),document.getElementById("load-spinner"));
			},
			
			addComponent: function(componentID, properties, container, callback){
				var that=this;
				require(["./" + components[componentID]], function(loadedModule){
					var component = React.createFactory(loadedModule)(properties)
					var renderedComponent = that.renderComponent(component, container);
					if(callback!=undefined){
						callback(renderedComponent);
					}
					return renderedComponent;
				});
				
			},


			renderComponent: function(component, container){
				//Let's create a dialog
				if (container == undefined){

					//create the dialog window for the widget
	                var dialog = $("<div id=" + component.props.id + "_dialog" + " class='dialog' title='" + component.props.name + "'></div>").dialog(
	                    {
	                        resizable: true,
	                        draggable: true,
	                        top: 10,
	                        height: 300,
	                        width: 350,
	                        dialogClass: component.props.id + "_dialog",
	                        close: function (event, ui) {
	                            if (event.originalEvent &&
	                                $(event.originalEvent.target).closest(".ui-dialog-titlebar-close").length) {
	                                $("#" + this.id).remove();
	                            }
	                        }
	                    });

	                var dialogParent = dialog.parent();
	                var that = this;

	                //remove the jQuery UI icon
	                dialogParent.find("button.ui-dialog-titlebar-close").html("");
	                dialogParent.find("button").append("<i class='fa fa-close'></i>");


	                //Take focus away from close button
	                dialogParent.find("button.ui-dialog-titlebar-close").blur();
	                dialogParent.css("z-index","100");

	                container = dialog.get(0);
				}

				return ReactDOM.render(component, container);
			}
	    };
	};
});
