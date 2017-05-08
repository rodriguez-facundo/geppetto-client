define(function (require) {

    var link = document.createElement("link");
    link.type = "text/css";
    link.rel = "stylesheet";
    link.href = "geppetto/js/components/interface/3dCanvas/Canvas.css";
    document.getElementsByTagName("head")[0].appendChild(link);

    var React = require('react');
    var isWebglEnabled = require('detector-webgl');
    var ThreeDEngine = require('./ThreeDEngine');

    var CameraControls = require('../cameraControls/CameraControls');

    var canvasComponent = React.createClass({
        engine: null,
        container: null,

        isDirty: false,

        //State
        canvasState: {
            cameraPosition: {x: 0, y: 0, z: 0},
            cameraRotation: {rx: 0, ry: 0, rz: 0, radius: 0},
            colorMap: {},
            colorFunctionMap: {},
            opacityMap: {},
            geometryTypeMap: {},
            instances: [],
            backgroundColor: 0x101010
        },


        /**
         * Displays all the passed instances in this canvas component
         * @param instances an array of instances
         * @returns {canvasComponent}
         */
        display: function (instances) {
            this.engine.buildScene(instances);
            this.instances = this.canvasState.instances.concat(instances.map(function (item) {
                return item.getInstancePath();
            }));
            this.setDirty(true);
            return this;
        },

        /**
         * Remove all the passed instances from this canvas component
         * This method is only able to remove instances that were explicitly added
         * e.g. if acnet2 is added acent2.baskets[3] can't be removed.
         * @param instances an array of instances
         * @returns {canvasComponent}
         */
        remove: function (instances) {
            for (var i = 0; i < instances.length; i++) {
                if (this.canvasState.instances.indexOf(instances[i].getInstancePath()) != -1) {
                    this.canvasState.instances.splice(this.canvasState.instances.indexOf(instances[i].getInstancePath()), 1);
                }
                this.engine.removeFromScene(instances[i]);
            }
            this.setDirty(true);
            this.resetCamera();
            return this;
        },


        /**
         * Displays all the instances available in the current model in this canvas
         * @returns {canvasComponent}
         */
        displayAllInstances: function () {
            var that = this;
            //TODO if the component is added after the events are triggered traverse all the existing instances
            GEPPETTO.on(GEPPETTO.Events.Instances_created, function (instances) {
                that.canvasState.instances = that.canvasState.instances.concat(instances.map(function (item) {
                    return item.getInstancePath();
                }));
                that.setDirty(true);
                that.engine.updateSceneWithNewInstances(instances);
                that.resetCamera();
            });
            GEPPETTO.on(GEPPETTO.Events.Instance_deleted, function (instance) {
                if (that.canvasState.instances.indexOf(instance.getInstancePath()) != -1) {
                    that.canvasState.instances.splice(that.canvasState.instances.indexOf(instance.getInstancePath()), 1);
                }
                that.setDirty(true);
                that.engine.removeFromScene(instance);
                that.resetCamera();
            });
            return this;
        },

        /**
         * Selects an instance
         *
         * @param {String} instancePath - Path of instance to select
         * @param {String} geometryIdentifier - Identifier of the geometry that was clicked
         */
        selectInstance: function (instancePath, geometryIdentifier) {
            this.engine.selectInstance(instancePath, geometryIdentifier);
            return this;
        },


        /**
         * Deselects an instance given its path
         * @param instancePath
         * @returns {canvasComponent}
         */
        deselectInstance: function (instancePath) {
            this.engine.deselectInstance(instancePath);
            return this;
        },

        /**
         *
         * @param instance
         * @returns {canvasComponent}
         */
        assignRandomColor: function (instance) {
            this.engine.assignRandomColor(instance);
            return this;
        },

        /**
         * Zoom to the passed instances
         * @param instances
         */
        zoomTo: function (instances) {
            this.engine.zoomTo(instances);
            return this;
        },

        /**
         * Sets whether to use wireframe or not to visualize any instance.
         */
        setWireframe: function (wireframe) {
            this.engine.setWireframe(wireframe);
            return this;
        },

        /**
         * Show an instance
         *
         * @param {String}
         *            instancePath - Instance path of the instance to make visible
         */
        showInstance: function (instancePath) {
            this.engine.showInstance(instancePath);
            return this;
        },

        /**
         * Hide an instance
         *
         * @param {String}
         *            instancePath - Path of the instance to hide
         */
        hideInstance: function (instancePath) {
            this.engine.hideInstance(instancePath);
            return this;
        },

        /**
         * Set background color for this canvas
         *
         * * @param {String} color - hex or rgb color. e.g. "#ff0000" / "rgb(255,0,0)"
         */
        setBackgroundColor: function (color) {
            this.canvasState.backgroundColor = color;
            this.setDirty(true);
            this.dialog.css("background", color);
        },

        /**
         * Change the color of a given instance
         *
         * @param {String}
         *            instancePath - Instance path of the instance to change color
         * @param {String}
         *            color - The color to set
         */
        setColor: function (instancePath, color) {
            this.engine.setColor(instancePath, color);
            this.canvasState.colorMap[instancePath] = color;
            this.setDirty(true);
            return this;
        },

        /**
         * Retrieves the color of a given instance
         *
         * @param {String}
         *            instance - Instance we want the color of
         */
        getColor: function (instance) {
            return this.engine.getColor(instance);
        },

        /**
         * Change the default opacity for a given instance
         *
         * @param {String}
         *            instancePath - Instance path of the instance to set the opacity of
         * @param {String}
         *            opacity - The value of the opacity between 0 and 1
         */
        setOpacity: function (instancePath, opacity) {
            this.engine.setOpacity(instancePath, opacity);
            this.canvasState.opacityMap[instancePath] = opacity;
            this.setDirty(true);
            return this;
        },

        /**
         * Set the threshold (number of 3D primitives on the scene) above which we switch the visualization to lines
         * @param threshold
         */
        setLinesThreshold: function (threshold) {
            this.engine.setLinesThreshold(threshold);
            return this;
        },

        /**
         * Change the type of geometry used to visualize a given instance
         *
         * @param {String}
         *            instance - The instance to change the geometry type for
         * @param {String}
         *            type - The geometry type, see GEPPETTO.Resources.GeometryTypes
         * @param {String}
         *            thickness - Optional: the thickness to be used if the geometry is "lines"
         */
        setGeometryType: function (instance, type, thickness) {
            this.engine.setGeometryType(instance, type, thickness);
            this.canvasState.geometryTypeMap[instance.getInstancePath()] = {"type": type, "thickness": thickness};
            this.setDirty(true);
            return this;
        },


        /**
         * Activates a visual group
         */
        showVisualGroups: function (visualGroup, mode, instances) {
            this.engine.showVisualGroups(visualGroup, mode, instances);
            return this;
        },

        /**
         * Associate a color function to a group of instances
         *
         * @param instances - The instances we want to change the color of
         * @param colorfn - The function to be used to modulate the color
         * @return {canvasComponent}
         */
        addColorFunction: function (instances, colorfn) {
            this.engine.colorController.addColorFunction(instances, colorfn);
            for (var i = 0; i < instances.length; i++) {
                this.canvasState.colorFunctionMap[instances[i].getInstancePath()] = colorfn.toString();
            }
            this.setDirty(true);
            return this;
        },

        /**
         * Remove a previously associated color function
         *
         * @param instances
         * @return {canvasComponent}
         */
        removeColorFunction: function (instances) {
            for (var i = 0; i < instances.length; i++) {
                if (this.colorFunctionMap[instances[i].getInstancePath()] != undefined) {
                    delete this.canvasState.colorFunctionMap[instances[i].getInstancePath()];
                }
            }
            this.setDirty(true);
            this.engine.colorController.removeColorFunction(instances);
            return this;
        },

        /**
         * Returns all the instances that are being listened to
         *
         * @return {Array}
         */
        getColorFunctionInstances: function () {
            return this.engine.colorController.getColorFunctionInstances();
        },

        /**
         * Shows the visual groups associated to the passed instance
         * @param instance
         * @returns {canvasComponent}
         */
        showVisualGroupsForInstance: function (instance) {
            this.engine.showVisualGroupsForInstance(instance);
            return this;
        },

        /**
         * @param x
         * @param y
         */
        incrementCameraPan: function (x, y) {
            this.engine.incrementCameraPan(x, y);
            return this;
        },

        /**
         * @param x
         * @param y
         * @param z
         */
        incrementCameraRotate: function (x, y, z) {
            this.engine.incrementCameraRotate(x, y, z);
            return this;
        },

        /**
         * @param z
         */
        incrementCameraZoom: function (z) {
            this.engine.incrementCameraZoom(z);
            return this;
        },

        /**
         * @param x
         * @param y
         * @param z
         */
        setCameraPosition: function (x, y, z) {
            this.canvasState.cameraPosition.x = x;
            this.canvasState.cameraPosition.y = y;
            this.canvasState.cameraPosition.z = z;
            this.setDirty(true);
            this.engine.setCameraPosition(x, y, z);
            return this;
        },

        /**
         * @param rx
         * @param ry
         * @param rz
         * @param radius
         */
        setCameraRotation: function (rx, ry, rz, radius) {
            this.canvasState.cameraRotation.rx = rx;
            this.canvasState.cameraRotation.ry = ry;
            this.canvasState.cameraRotation.rz = rz;
            this.canvasState.cameraRotation.radius = radius;
            this.setDirty(true);
            this.engine.setCameraRotation(rx, ry, rz, radius);
            return this;
        },

        /**
         * Rotate the camera around the selection
         *
         */
        autoRotate: function () {
            this.engine.autoRotate();
            return this;
        },

        /**
         * Resets the camera
         *
         * @returns {canvasComponent}
         */
        resetCamera: function () {
            this.engine.resetCamera();
            return this;
        },


        /**
         * Set container dimensions depending on parent dialog
         */
        setContainerDimensions: function () {
            var containerSelector = $(this.container);
            var height = containerSelector.parent().height();
            var width = containerSelector.parent().width();
            containerSelector.height(height);
            containerSelector.width(width);
            return [width, height];
        },


        //TODO Move to base class for components
        /**
         * Did something change in the state of the widget?
         *
         * @command isDirty()
         * @returns {boolean} - ID of widget
         */
        isDirty: function () {
            return this.isDirty;
        },

        //TODO Move to base class for components
        /**
         * Explicitly sets status of view
         * NOTE: we need to be able to control this from outside the component
         *
         * @command setDirty()
         * @param {boolean} dirty
         */
        setDirty: function (dirty) {
            this.isDirty = dirty;
        },

        /**
         *
         * @param view
         */
        setView: function (view) {
            // set base properties
            Widget.View.prototype.setView.call(this, view);

            // set data
            if (view.data != undefined) {
                if (view.dataType == 'instances') {
                    this.display(view.data);
                }
            }

            // set component specific stuff, only custom handlers for popup widget
            if (view.componentSpecific != undefined) {
                if (view.componentSpecific.cameraRotation != undefined) {
                    this.setCameraRotation(
                        view.componentSpecific.cameraRotation.rx,
                        view.componentSpecific.cameraRotation.ry,
                        view.componentSpecific.cameraRotation.rz,
                        view.componentSpecific.cameraRotation.radius);
                }
                if (view.componentSpecific.cameraPosition != undefined) {
                    this.setCameraPosition(
                        view.componentSpecific.cameraPosition.x,
                        view.componentSpecific.cameraPosition.y,
                        view.componentSpecific.cameraPosition.z);
                }
                if (view.componentSpecific.colorMap != undefined) {
                    for (var path in view.componentSpecific.colorMap) {
                        this.setColor(path, view.componentSpecific.colorMap[path]);
                    }
                }
                if (view.componentSpecific.opacityMap != undefined) {
                    for (var path in view.componentSpecific.opacityMap) {
                        this.setOpacity(path, view.componentSpecific.opacityMap[path]);
                    }
                }
                if (view.componentSpecific.geometryTypeMap != undefined) {
                    for (var path in view.componentSpecific.geometryTypeMap) {
                        this.setGeometryType(eval(path),
                            view.componentSpecific.geometryTypeMap[path].type,
                            view.componentSpecific.geometryTypeMap[path].thickness);
                    }
                }
                if (view.componentSpecific.colorFunctionMap != undefined) {
                    for (var path in view.componentSpecific.colorFunctionMap) {
                        this.addColorFunction([eval(path)], eval("(" + view.componentSpecific.colorFunctionMap[path] + ")"));
                    }
                }
                if (view.componentSpecific.backgroundColor != undefined) {
                    this.setBackgroundColor(view.componentSpecific.backgroundColor);
                }
            }

            // after setting view through setView, reset dirty flag
            this.setDirty(false);
        },


        /**
         *
         * @returns {*}
         */
        getView: function () {
            var baseView = Widget.View.prototype.getView.call(this);

            // add data-type and data field + any other custom fields in the component-specific attribute
            baseView.dataType = "instances";
            baseView.data = this.instances;
            baseView.componentSpecific = this.canvasState;
            return baseView;
        },

        /**
         *
         * @returns {boolean}
         */
        shouldComponentUpdate() {
            return false;
        },

        /**
         *
         */
        componentDidMount: function () {
            if (!isWebglEnabled) {
                Detector.addGetWebGLMessage();
            } else {
                this.container = $("#" + this.props.id + "_component").get(0);
                var [width, height] = this.setContainerDimensions();
                this.engine = new ThreeDEngine(this.container, this.props.id);
                this.engine.setSize(width, height);

                GEPPETTO.SceneController.add3DCanvas(this);

                var that = this;
                $("#" + this.props.id).on("dialogresizestop resizeEnd", function (event, ui) {
                    var [width, height] = that.setContainerDimensions();
                    that.engine.setSize(width, height);
                });

                window.addEventListener('resize', function () {
                    var [width, height] = that.setContainerDimensions();
                    that.engine.setSize(width, height);
                }, false);

            }
        },

        /**
         *
         * @returns {XML}
         */
        render: function () {
            return (
                <div key={this.props.id + "_component"} id={this.props.id + "_component"} className="canvas">
                    <CameraControls viewer={this.props.id}/>
                </div>
            )
        }
    });
    return canvasComponent;
});