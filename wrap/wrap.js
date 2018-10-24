//
//  wrap.js
//
//  Created by Daniela Fontes on 25 Jun 2018
//  Copyright 2018 High Fidelity, Inc.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

/* global Tablet, Entities, Vec3, Graphics, Script, Quat, Assets, HMD, SPACE_LOCAL */

(function () {
    // Utilities
    Script.include("./utilities/utilities.js");
    // Modules
    Script.include("./modules/hand.js");

    var tablet,
        button,
        BUTTON_NAME = "WRAP",
        SCRIPT_PATH = Script.resolvePath(''),
        CONTENT_PATH = SCRIPT_PATH.substr(0, SCRIPT_PATH.lastIndexOf('/')),
        APP_URL = CONTENT_PATH + "/html/polylineList.html";
    
    var _shouldRestoreTablet = false,
        isWrapping = false;

    function getDistanceToCamera(position) {
        var cameraPosition = Camera.getPosition();
        var toCameraDistance = Vec3.length(Vec3.subtract(cameraPosition, position));
        return toCameraDistance;
    }

    var LEFT_HAND = 0,
        RIGHT_HAND = 1;
    var leftHandController = new Hand(LEFT_HAND);
    var rightHandController = new Hand(RIGHT_HAND);
    
    // Selection Manager
    var SelectionManager = (function() {
        var that = {};
        
        
        var COLOR_SCALE_EDGE = { red:87, green:87, blue:87 };
        var COLOR_SCALE_CUBE = { red:106, green:106, blue:106 };

        var SCALE_CUBE_OFFSET = 0.5;
        var SCALE_CUBE_CAMERA_DISTANCE_MULTIPLE = 0.015;

        var ROTATE_RING_CAMERA_DISTANCE_MULTIPLE = 0.15;

        

        var handlePropertiesScaleCubes = {
            size: 0.025,
            color: COLOR_SCALE_CUBE,
            solid: true,
            visible: false,
            ignoreRayIntersection: false,
            drawInFront: true,
            borderSize: 1.4
        };
        var handleScaleLBNCube = Overlays.addOverlay("cube", handlePropertiesScaleCubes); // (-x, -y, -z)
        var handleScaleRBNCube = Overlays.addOverlay("cube", handlePropertiesScaleCubes); // ( x, -y, -z)
        var handleScaleLBFCube = Overlays.addOverlay("cube", handlePropertiesScaleCubes); // (-x, -y,  z)
        var handleScaleRBFCube = Overlays.addOverlay("cube", handlePropertiesScaleCubes); // ( x, -y,  z)
        var handleScaleLTNCube = Overlays.addOverlay("cube", handlePropertiesScaleCubes); // (-x,  y, -z)
        var handleScaleRTNCube = Overlays.addOverlay("cube", handlePropertiesScaleCubes); // ( x,  y, -z)
        var handleScaleLTFCube = Overlays.addOverlay("cube", handlePropertiesScaleCubes); // (-x,  y,  z)
        var handleScaleRTFCube = Overlays.addOverlay("cube", handlePropertiesScaleCubes); // ( x,  y,  z)

        var handlePropertiesScaleEdge = {
            color: COLOR_SCALE_EDGE,
            visible: false,
            ignoreRayIntersection: true,
            drawInFront: true,
            lineWidth: 0.2
        };
        var handleScaleTREdge = Overlays.addOverlay("line3d", handlePropertiesScaleEdge);
        var handleScaleTLEdge = Overlays.addOverlay("line3d", handlePropertiesScaleEdge);
        var handleScaleTFEdge = Overlays.addOverlay("line3d", handlePropertiesScaleEdge);
        var handleScaleTNEdge = Overlays.addOverlay("line3d", handlePropertiesScaleEdge);
        var handleScaleBREdge = Overlays.addOverlay("line3d", handlePropertiesScaleEdge);
        var handleScaleBLEdge = Overlays.addOverlay("line3d", handlePropertiesScaleEdge);
        var handleScaleBFEdge = Overlays.addOverlay("line3d", handlePropertiesScaleEdge);
        var handleScaleBNEdge = Overlays.addOverlay("line3d", handlePropertiesScaleEdge);
        var handleScaleNREdge = Overlays.addOverlay("line3d", handlePropertiesScaleEdge);
        var handleScaleNLEdge = Overlays.addOverlay("line3d", handlePropertiesScaleEdge);
        var handleScaleFREdge = Overlays.addOverlay("line3d", handlePropertiesScaleEdge);
        var handleScaleFLEdge = Overlays.addOverlay("line3d", handlePropertiesScaleEdge);

        var allOverlays = [
            handleScaleLBNCube,
            handleScaleRBNCube,
            handleScaleLBFCube,
            handleScaleRBFCube,
            handleScaleLTNCube,
            handleScaleRTNCube,
            handleScaleLTFCube,
            handleScaleRTFCube,
            handleScaleTREdge,
            handleScaleTLEdge,
            handleScaleTFEdge,
            handleScaleTNEdge,
            handleScaleBREdge,
            handleScaleBLEdge,
            handleScaleBFEdge,
            handleScaleBNEdge,
            handleScaleNREdge,
            handleScaleNLEdge,
            handleScaleFREdge,
            handleScaleFLEdge
        ];
        // FUNCTION: SET OVERLAYS VISIBLE
        that.setOverlaysVisible = function(isVisible) {
            for (var i = 0, length = allOverlays.length; i < length; i++) {
                Overlays.editOverlay(allOverlays[i], { visible: isVisible });
            }
        };

        // FUNCTION: UPDATE HANDLES
        that.updateHandles = function() {
            var wantDebug = false;
            if (wantDebug) {
                print("======> Update Handles =======");
                print("    Selections Count: " + that.selections.length);
            }
            if (that.selections === undefined) {
                return;
            }

            if (that.selections.length === 0) {
                // TODO
                that.setOverlaysVisible(false);
                return;
            }

            if (that.hasSelection()) {
                var position = that.worldPosition;
                var rotation = that.worldRotation;
                var dimensions = that.worldDimensions;
                var toCameraDistance = getDistanceToCamera(position);

                // in HMD we clamp the overlays to the bounding box for now so lasers can hit them
                var maxHandleDimension = 0;
                if (HMD.active) {
                    maxHandleDimension = Math.max(dimensions.x, dimensions.y, dimensions.z);
                }
                var rotateDimension = Math.max(maxHandleDimension, toCameraDistance * ROTATE_RING_CAMERA_DISTANCE_MULTIPLE);
                
                // UPDATE SCALE CUBES
                var scaleCubeOffsetX = SCALE_CUBE_OFFSET * dimensions.x;
                var scaleCubeOffsetY = SCALE_CUBE_OFFSET * dimensions.y;
                var scaleCubeOffsetZ = SCALE_CUBE_OFFSET * dimensions.z;
                var scaleCubeDimension = rotateDimension * SCALE_CUBE_CAMERA_DISTANCE_MULTIPLE / 
                                                            ROTATE_RING_CAMERA_DISTANCE_MULTIPLE;
                var scaleCubeDimensions = { x:scaleCubeDimension, y:scaleCubeDimension, z:scaleCubeDimension };
                var scaleCubeRotation = Quat.IDENTITY;
                var scaleLBNCubePosition = { x:-scaleCubeOffsetX, y:-scaleCubeOffsetY, z:-scaleCubeOffsetZ };
                scaleLBNCubePosition = Vec3.sum(position, Vec3.multiplyQbyV(rotation, scaleLBNCubePosition));
                Overlays.editOverlay(handleScaleLBNCube, { 
                    position: scaleLBNCubePosition, 
                    rotation: scaleCubeRotation,
                    dimensions: scaleCubeDimensions
                });
                var scaleRBNCubePosition = { x:scaleCubeOffsetX, y:-scaleCubeOffsetY, z:-scaleCubeOffsetZ };
                scaleRBNCubePosition = Vec3.sum(position, Vec3.multiplyQbyV(rotation, scaleRBNCubePosition));
                Overlays.editOverlay(handleScaleRBNCube, { 
                    position: scaleRBNCubePosition, 
                    rotation: scaleCubeRotation,
                    dimensions: scaleCubeDimensions
                });
                var scaleLBFCubePosition = { x:-scaleCubeOffsetX, y:-scaleCubeOffsetY, z:scaleCubeOffsetZ };
                scaleLBFCubePosition = Vec3.sum(position, Vec3.multiplyQbyV(rotation, scaleLBFCubePosition));
                Overlays.editOverlay(handleScaleLBFCube, { 
                    position: scaleLBFCubePosition, 
                    rotation: scaleCubeRotation,
                    dimensions: scaleCubeDimensions
                });
                var scaleRBFCubePosition = { x:scaleCubeOffsetX, y:-scaleCubeOffsetY, z:scaleCubeOffsetZ };
                scaleRBFCubePosition = Vec3.sum(position, Vec3.multiplyQbyV(rotation, scaleRBFCubePosition));
                Overlays.editOverlay(handleScaleRBFCube, { 
                    position: scaleRBFCubePosition, 
                    rotation: scaleCubeRotation,
                    dimensions: scaleCubeDimensions
                });
                var scaleLTNCubePosition = { x:-scaleCubeOffsetX, y:scaleCubeOffsetY, z:-scaleCubeOffsetZ };
                scaleLTNCubePosition = Vec3.sum(position, Vec3.multiplyQbyV(rotation, scaleLTNCubePosition));
                Overlays.editOverlay(handleScaleLTNCube, { 
                    position: scaleLTNCubePosition, 
                    rotation: scaleCubeRotation,
                    dimensions: scaleCubeDimensions
                });
                var scaleRTNCubePosition = { x:scaleCubeOffsetX, y:scaleCubeOffsetY, z:-scaleCubeOffsetZ };
                scaleRTNCubePosition = Vec3.sum(position, Vec3.multiplyQbyV(rotation, scaleRTNCubePosition));
                Overlays.editOverlay(handleScaleRTNCube, { 
                    position: scaleRTNCubePosition, 
                    rotation: scaleCubeRotation,
                    dimensions: scaleCubeDimensions
                });
                var scaleLTFCubePosition = { x:-scaleCubeOffsetX, y:scaleCubeOffsetY, z:scaleCubeOffsetZ };
                scaleLTFCubePosition = Vec3.sum(position, Vec3.multiplyQbyV(rotation, scaleLTFCubePosition));
                Overlays.editOverlay(handleScaleLTFCube, { 
                    position: scaleLTFCubePosition, 
                    rotation: scaleCubeRotation,
                    dimensions: scaleCubeDimensions
                });
                var scaleRTFCubePosition = { x:scaleCubeOffsetX, y:scaleCubeOffsetY, z:scaleCubeOffsetZ };
                scaleRTFCubePosition = Vec3.sum(position, Vec3.multiplyQbyV(rotation, scaleRTFCubePosition));
                Overlays.editOverlay(handleScaleRTFCube, { 
                    position: scaleRTFCubePosition, 
                    rotation: scaleCubeRotation,
                    dimensions: scaleCubeDimensions
                });

                // UPDATE SCALE EDGES
                Overlays.editOverlay(handleScaleTREdge, { start: scaleRTNCubePosition, end: scaleRTFCubePosition });
                Overlays.editOverlay(handleScaleTLEdge, { start: scaleLTNCubePosition, end: scaleLTFCubePosition });
                Overlays.editOverlay(handleScaleTFEdge, { start: scaleLTFCubePosition, end: scaleRTFCubePosition });
                Overlays.editOverlay(handleScaleTNEdge, { start: scaleLTNCubePosition, end: scaleRTNCubePosition });
                Overlays.editOverlay(handleScaleBREdge, { start: scaleRBNCubePosition, end: scaleRBFCubePosition });
                Overlays.editOverlay(handleScaleBLEdge, { start: scaleLBNCubePosition, end: scaleLBFCubePosition });
                Overlays.editOverlay(handleScaleBFEdge, { start: scaleLBFCubePosition, end: scaleRBFCubePosition });
                Overlays.editOverlay(handleScaleBNEdge, { start: scaleLBNCubePosition, end: scaleRBNCubePosition });
                Overlays.editOverlay(handleScaleNREdge, { start: scaleRTNCubePosition, end: scaleRBNCubePosition });
                Overlays.editOverlay(handleScaleNLEdge, { start: scaleLTNCubePosition, end: scaleLBNCubePosition });
                Overlays.editOverlay(handleScaleFREdge, { start: scaleRTFCubePosition, end: scaleRBFCubePosition });
                Overlays.editOverlay(handleScaleFLEdge, { start: scaleLTFCubePosition, end: scaleLBFCubePosition });

                that.setOverlaysVisible(true);
            }
        };
        
        Script.update.connect(that.updateHandles);

    
        that.savedProperties = {};
        that.selections = [];
        var listeners = [];
    
        that.localRotation = Quat.IDENTITY;
        that.localPosition = Vec3.ZERO;
        that.localDimensions = Vec3.ZERO;
        that.localRegistrationPoint = Vec3.HALF;
    
        that.worldRotation = Quat.IDENTITY;
        that.worldPosition = Vec3.ZERO;
        that.worldDimensions = Vec3.ZERO;
        that.worldRegistrationPoint = Vec3.HALF;
        that.centerPosition = Vec3.ZERO;
    
        that.saveProperties = function() {
            that.savedProperties = {};
            for (var i = 0; i < that.selections.length; i++) {
                var entityID = that.selections[i];
                that.savedProperties[entityID] = Entities.getEntityProperties(entityID);
            }
        };
    
        that.addEventListener = function(func) {
            listeners.push(func);
        };
    
        that.hasSelection = function() {
            return that.selections.length > 0;
        };
    
        that.setSelections = function(entityIDs) {
            that.selections = [];
            for (var i = 0; i < entityIDs.length; i++) {
                var entityID = entityIDs[i];
                that.selections.push(entityID);
            }
    
            that._update(true);
        };
    
        that.addEntity = function(entityID, toggleSelection) {
            if (entityID) {
                var idx = -1;
                for (var i = 0; i < that.selections.length; i++) {
                    if (entityID === that.selections[i]) {
                        idx = i;
                        break;
                    }
                }
                if (idx === -1) {
                    that.selections.push(entityID);
                } else if (toggleSelection) {
                    that.selections.splice(idx, 1);
                }
            }
    
            that._update(true);
        };
    
        function removeEntityByID(entityID) {
            var idx = that.selections.indexOf(entityID);
            if (idx >= 0) {
                that.selections.splice(idx, 1);
            }
        }
    
        that.removeEntity = function (entityID) {
            removeEntityByID(entityID);
            that._update(true);
        };
    
        that.removeEntities = function(entityIDs) {
            for (var i = 0, length = entityIDs.length; i < length; i++) {
                removeEntityByID(entityIDs[i]);
            }
            that._update(true);
        };
    
        that.clearSelections = function() {
            that.selections = [];
            that._update(true);
        };
    
        that.duplicateSelection = function() {
            var duplicatedEntityIDs = [];
            Object.keys(that.savedProperties).forEach(function(otherEntityID) {
                var properties = that.savedProperties[otherEntityID];
                if (!properties.locked && (!properties.clientOnly || properties.owningAvatarID === MyAvatar.sessionUUID)) {
                    duplicatedEntityIDs.push({
                        entityID: Entities.addEntity(properties),
                        properties: properties
                    });
                }
            });
            return duplicatedEntityIDs;
        };
    
        that._update = function(selectionUpdated) {
            var properties = null;
            if (that.selections.length === 0) {
                that.localDimensions = null;
                that.localPosition = null;
                that.worldDimensions = null;
                that.worldPosition = null;
                that.worldRotation = null;
            } else if (that.selections.length === 1) {
                properties = Entities.getEntityProperties(that.selections[0]);
                that.localDimensions = properties.dimensions;
                that.localPosition = properties.position;
                that.localRotation = properties.rotation;
                that.localRegistrationPoint = properties.registrationPoint;
    
                that.worldDimensions = properties.boundingBox.dimensions;
                that.worldPosition = properties.boundingBox.center;
                that.worldRotation = properties.boundingBox.rotation;
    
                that.entityType = properties.type;
    
            } else {
                that.localRotation = null;
                that.localDimensions = null;
                that.localPosition = null;
    
                properties = Entities.getEntityProperties(that.selections[0]);
    
                that.entityType = properties.type;
    
                var brn = properties.boundingBox.brn;
                var tfl = properties.boundingBox.tfl;
    
                for (var i = 1; i < that.selections.length; i++) {
                    properties = Entities.getEntityProperties(that.selections[i]);
                    var bb = properties.boundingBox;
                    brn.x = Math.min(bb.brn.x, brn.x);
                    brn.y = Math.min(bb.brn.y, brn.y);
                    brn.z = Math.min(bb.brn.z, brn.z);
                    tfl.x = Math.max(bb.tfl.x, tfl.x);
                    tfl.y = Math.max(bb.tfl.y, tfl.y);
                    tfl.z = Math.max(bb.tfl.z, tfl.z);
                }
    
                that.localDimensions = null;
                that.localPosition = null;
                that.worldDimensions = {
                    x: tfl.x - brn.x,
                    y: tfl.y - brn.y,
                    z: tfl.z - brn.z
                };
                that.worldPosition = {
                    x: brn.x + (that.worldDimensions.x / 2),
                    y: brn.y + (that.worldDimensions.y / 2),
                    z: brn.z + (that.worldDimensions.z / 2)
                };
    
            }
    
            for (var j = 0; j < listeners.length; j++) {
                try {
                    listeners[j](selectionUpdated === true);
                } catch (e) {
                    print("ERROR: entitySelectionTool.update got exception: " + JSON.stringify(e));
                }
            }
        };
    
        return that;
    })();

    var selectionManager = SelectionManager;

    

    // web
    var MIN_FILENAME_LENGTH = 4;
    var searchRadius = 10;
    var filename = "wrapObject";
    var FILE_NAME_PREFIX = "wrapObject";
    var WRAPKEY = "wrap/filenumber";
    var isUsingTextures = false;
    var textureCallbackCount = 0;
    var totalNumberOfTextures = 0;
    var objInfo;
    var isPlacingOBJInWorld = false;
    var CONTROLLER_SEARCH_RADIUS = 0.25;
    var UIOverlaysRight = [];
    var UIOverlaysLeft = [];
    var polylines = [];

    var handSelection = function() {
        var found = [];
        leftHandController.update();
        rightHandController.update();
        if(leftHandController.gripClicked()) {
            leftHandController.setGripClickedHandled();
            found = Entities.findEntitiesByType("PolyLine", MyAvatar.getLeftPalmPosition(), CONTROLLER_SEARCH_RADIUS);
            
            found.forEach(function(entityID) {
                addEntity(entityID, true);
            });
            // Selection effect
            UIOverlaysLeft.push(Overlays.addOverlay("sphere", {

                position: MyAvatar.getLeftPalmPosition(),
                dimensions: { x: CONTROLLER_SEARCH_RADIUS, y: CONTROLLER_SEARCH_RADIUS, z: CONTROLLER_SEARCH_RADIUS},
                alpha: 0.5,
                color: { red: 0, green: 0, blue: 125 }
                
            }));
            Script.setTimeout(function () {
                UIOverlaysLeft.forEach(function(overlayID) {
                    Overlays.deleteOverlay(overlayID);
                });
                UIOverlaysLeft = [];
            }, 500);

        }
        if(rightHandController.gripClicked()) {
            rightHandController.setGripClickedHandled();
        
            found = Entities.findEntitiesByType("PolyLine", MyAvatar.getRightPalmPosition(), CONTROLLER_SEARCH_RADIUS);
            
            
            found.forEach(function(entityID) {
                addEntity(entityID, true);
            });
            UIOverlaysRight.push(Overlays.addOverlay("sphere", {

                position: MyAvatar.getRightPalmPosition(),
                dimensions: { x: CONTROLLER_SEARCH_RADIUS, y: CONTROLLER_SEARCH_RADIUS, z: CONTROLLER_SEARCH_RADIUS},
                alpha: 0.5,
                color: { red: 0, green: 0, blue: 125 }
                
            }));
            Script.setTimeout(function () {
                UIOverlaysRight.forEach(function(overlayID) {
                    Overlays.deleteOverlay(overlayID);
                });
                UIOverlaysRight = [];
            }, 500);
        }
    }
    Script.update.connect(handSelection);

    var addEntity = function(entityID, toggleSelection) {
        if (entityID) {
            var idx = -1;
            for (var i = 0; i < polylines.length; i++) {
                if (entityID === polylines[i]) {
                    idx = i;
                    break;
                }
            }
            if (idx === -1) {
                polylines.push(entityID);
            } else if (toggleSelection) {
                polylines.splice(idx, 1);
            }
        }
        
        sendUpdate();
    };
    
    function placeOBJInWorld(url) {
        Entities.addEntity({
            type: "Model",
            modelURL: "atp:"+ url,
            shapeType: "simple-compound",
            position: Vec3.sum(MyAvatar.position, Vec3.multiplyQbyV(MyAvatar.orientation, { x: 0, y: 0.75, z: -5 })),
            dimensions: { x: 1, y: 1, z: 1 },
            dynamic: true,
            collisionless: false,
            userData: "{ \"grabbableKey\": { \"grabbable\": true, \"kinematic\": false } }",
            // Delete after 5 minutes.
            lifetime: 300  
        });
    }

    function removeSelectedPolylines() {
        // remove selectedPolylines from polylines
        var removedIDS = [];
        var i;
        for (i = 0; i < selectionManager.selections.length; i++) {
            removedIDS.push(selectionManager.selections[i]);
        }
        print("PRE Polylines length. " + selectionManager.selections.length);
        for (i = 0; i < removedIDS.length; i++) {
            var idx = polylines.indexOf(removedIDS[i]);
            if (idx >= 0) {
                polylines.splice(idx, 1); 
            }
        }
        print("Polylines length. " + polylines.length);
        selectionManager.removeEntities(removedIDS);

        var data = {
            type: 'polylinesRemoved',
            ids: removedIDS
        };
        tablet.emitScriptEvent(JSON.stringify(data));
        sendUpdate();
        return removedIDS;
    }

    selectionManager.addEventListener(function() {
        var selectedIDs = [];

        for (var i = 0; i < selectionManager.selections.length; i++) {
            selectedIDs.push(selectionManager.selections[i]);
        }

        var data = {
            type: 'selectionUpdatePolylines',
            selectedIDs: selectedIDs
        };
        tablet.emitScriptEvent(JSON.stringify(data));
    });

    function clearPolylineList() {
        var data = {
            type: 'clearPolylineList'
        };
        tablet.emitScriptEvent(JSON.stringify(data));
    }

    function sendUpdate() {
        var entities = [];

        var ids = polylines;
        
        for (var i = 0; i < ids.length; i++) {
            var id = ids[i];
            var properties = Entities.getEntityProperties(id);

            var url = "";
            
            entities.push({
                id: id,
                name: properties.name,
                type: properties.type,
                url: url,
                locked: properties.locked,
                visible: properties.visible,
                verticesCount: valueIfDefined(properties.renderInfo.verticesCount),
                texturesCount: valueIfDefined(properties.renderInfo.texturesCount),
                texturesSize: valueIfDefined(properties.renderInfo.texturesSize),
                hasTransparent: valueIfDefined(properties.renderInfo.hasTransparent),
                isBaked: properties.type === "Model" ? url.toLowerCase().endsWith(".baked.fbx") : false,
                drawCalls: valueIfDefined(properties.renderInfo.drawCalls),
                hasScript: properties.script !== ""
            });
            
        }

        var selectedIDs = [];
        for (var j = 0; j < selectionManager.selections.length; j++) {
            selectedIDs.push(selectionManager.selections[j]);
        }

        var data = {
            type: "updatePolylines",
            entities: entities,
            selectedIDs: selectedIDs
        };
        tablet.emitScriptEvent(JSON.stringify(data));
    }

    function valueIfDefined(value) {
        return value !== undefined ? value : "";
    }

    function exportOBJFromPolylines(isPlacingInWorld) {
        // Define Filename
        var currentFileNumber = Settings.getValue(WRAPKEY);
        if (currentFileNumber === undefined) {
            currentFileNumber = 1;
        }
        filename = FILE_NAME_PREFIX + currentFileNumber;
        currentFileNumber++;
        Settings.setValue(WRAPKEY, currentFileNumber);

        var model;
        print("POLYLINES LENGHTH + " + polylines.length);
        // convert polyline linePoints to vertices
        if (polylines.length >= 1) {
            var meshes = [];
            var initialPosition = undefined;
            var meshOffset = Vec3.ZERO;
            var mtls = [];
            var textures = [];
            var polylineIndex = 0;
            polylines.forEach(function(id) {
                var polyline = Entities.getEntityProperties(id);
                if (initialPosition === undefined) {
                    initialPosition = polyline.position;
                } else {
                    meshOffset = Vec3.subtract(polyline.position, initialPosition);
                }
                var linePoints = polyline.linePoints;
                var normals = polyline.normals;
                var strokeWidths = polyline.strokeWidths;
                var colors = polyline.strokeColors;
                var isUVModeStretch = polyline.isUVModeStretch;
                
                var vertices = [];
                var normalsForVertices = [];
                var colorsForVertices = [];
                var texCoords0ForVertices = [];
                var binormal;
                var tangent;
                var i;
                var size = linePoints.length;

                var uCoordInc = 1.0 / size;
                var uCoord = 0.0;

                var accumulatedDistance = 0.0;
                var distanceToLastPoint = 0.0;
                var accumulatedStrokeWidth = 0.0;
                var strokeWidth = 0.0;
                var doesStrokeWidthVary = false;
                var textureAspectRatio = 1.0;

                for (i = 1; i < strokeWidths.length; i++) {
                    if (strokeWidths[i] !== strokeWidths[i - 1]) {
                        doesStrokeWidthVary = true;
                        break;
                    }
                }

                for (i = 0; i < linePoints.length ; i++){
                    var vertexIndex = i * 2;
                    if (i < linePoints.length - 1) {
                        tangent = Vec3.subtract(linePoints[i + 1], linePoints[i]);
                        binormal = Vec3.multiply(Vec3.normalize(Vec3.cross(tangent, normals[i])), strokeWidths[i]);
                        if (isNaN(binormal.x)) {
                            continue;
                        }
                    }
                    
                    // add the 2 vertices
                    vertices.push(Vec3.sum(Vec3.sum(linePoints[i], binormal), meshOffset));
                    vertices.push(Vec3.sum(Vec3.subtract(linePoints[i], binormal), meshOffset));
                    
                    normalsForVertices.push(normals[i]);
                    normalsForVertices.push(normals[i]);

                    // Color
                    var color = {x: 0, y: 0.0, z: 0.0};
                    if (colors.length > 1) {
                        colorsForVertices.push(colors[i]);
                        colorsForVertices.push(colors[i]);
                    } else {
                        color.x = polyline.color.red / 256;
                        color.y = polyline.color.green / 256;
                        color.z = polyline.color.blue / 256;
                        colorsForVertices.push(color);
                        colorsForVertices.push(color);
                    }
                    
                    // UVs
                    if (isUVModeStretch && vertexIndex >= 2) {
                        // stretch
                        uCoord += uCoordInc;
                        
                    } else if (!isUVModeStretch && i>= 1) {
                        // repeat
                        distanceToLastPoint = Vec3.distance(linePoints[i], linePoints[i-1]);
                        accumulatedDistance += distanceToLastPoint;
                        strokeWidth = 2 * strokeWidths[i];

                        if (doesStrokeWidthVary) {
                            // If the stroke varies along the line the texture will stretch more or less depending on the speed
                            // because it looks better than using the same method as below
                            accumulatedStrokeWidth += strokeWidth;
                            var increaseValue = 1;
                            if (accumulatedStrokeWidth !== 0) {
                                var newUcoord = Math.ceil(
                                    ((1.0 / textureAspectRatio) * accumulatedDistance) / 
                                    (accumulatedStrokeWidth / i)
                                );
                                increaseValue = newUcoord - uCoord;
                            }
                            increaseValue = increaseValue > 0 ? increaseValue : 1;
                            uCoord += increaseValue;
                        }
                    }
                    
                    texCoords0ForVertices.push({x: uCoord, y: 0.0});
                    texCoords0ForVertices.push({x: uCoord, y: 1.0});

                }

                meshes.push( 
                    Graphics.newMesh(
                        meshDataForPolyline(vertices, normalsForVertices, colorsForVertices, texCoords0ForVertices, false)
                    )
                );
                meshes.push(
                    Graphics.newMesh(
                        meshDataForPolyline(vertices, normalsForVertices, colorsForVertices, texCoords0ForVertices, true)
                    )
                );

                mtls.push("usemtl polyline"+ polylineIndex);
                textures.push(polyline.textures);
                print("Textures to upload: " + polyline.textures);

                polylineIndex++;
            });
            // Create Model
            model = Graphics.newModel(meshes);

            // Create .mtl file
            var obj = Graphics.exportModelToOBJ(model);
            objInfo = obj;
            var mtl = "";
            if (isUsingTextures) {
                textureCallbackCount = 0;
                totalNumberOfTextures = mtls.length;
                obj = obj.replace( "writeOBJToTextStream", ("writeOBJToTextStream\nmtllib "+ filename +".mtl") );
                for (var i = 0 ; i< mtls.length; i++) {
                    obj = obj.replace( ("faces::subMeshIndex " +i*2) , ("faces::subMeshIndex " +i*2 +"\n" + mtls[i]) );
                    obj = obj.replace( ("faces::subMeshIndex " +(i*2+1)) , ("faces::subMeshIndex " +(i*2+1) +"\n" + mtls[i]) );
  
                    makeRequest(i, textures[i]);
    
                    // mtl += "newmtl polyline"+ i + "\nillum 0\nKd 0.00 0.00 0.00\nKa 0.00 0.00 0.00\nTf 1.00 1.00 1.00\nmap_Kd " + filename+ "/texture"+i+".png" + "\nNi 1.00\n";
                     mtl += "newmtl polyline"+ i + "\nillum 6\nKd 0.50 0.50 0.50\nKa 0.00 0.00 0.00\nmap_Kd "+ filename+ "/texture"+i+".png" + "\nmap_d " + filename+ "/texture"+i+".png" + "\nNi 1.00\n";
                    // mtl += "newmtl polyline"+ i + "\nillum 6\nKa 0.00 0.00 0.00" + "\nmap_d " + filename+ "/texture"+i+".png" + "\nNi 1.00\n";
                
                }
                print("Check OBJ file: " + obj);
                print("Check MTL file: " + mtl);
                Assets.putAsset({
                    data: mtl,
                    path: "/"+  filename +".mtl"
                }, uploadDataCallback);
            } else {

                Assets.putAsset({
                    data: obj,
                    path: "/"+ filename +".obj"
                }, uploadDataCallbackOBJ);
    
                Assets.saveToCache({
                    data: obj,
                    path: "atp:/"+ filename +".obj"
                }, uploadDataCallback);
            }

            
        } else {
            print("No Polylines Selected.");
        }
    }

    function makeRequest(i, textureURL) {
        var request = new XMLHttpRequest();
        request.onreadystatechange = function() {
            print(" iteration " + i);
            print("ready state: ", request.readyState, request.status, request.readyState === request.DONE, request.response);
            if (request.readyState === request.DONE && request.status === 200) {
                print("Got response for high score: "+ request.response.byteLength);
                print("Got response for high score: "+ JSON.stringify(request.response));
                
                Assets.putAsset({
                    data: request.response,
                    path: "/"+ filename+ "/texture"+i+".png" 
                }, uploadDataCallbackTextures);
            }
        };
        request.responseType = 'arraybuffer';
        request.open('GET', textureURL );
        request.timeout = 10000;
        request.send();
    };

    function uploadDataCallback(url, hash) {
    }

    function uploadDataCallbackTextures(url, hash) {
        textureCallbackCount++;
        if (textureCallbackCount == totalNumberOfTextures) {
            Assets.putAsset({
                data: objInfo,
                path: "/"+ filename +".obj"
            }, uploadDataCallbackOBJ);

            Assets.saveToCache({
                data: objInfo,
                path: "atp:/"+ filename +".obj"
            }, uploadDataCallback);
        }
    }
    
    function uploadDataCallbackOBJ(url, hash) {
        print(" UPLOAD OBJ ");
        if (isPlacingOBJInWorld) {
            print(" UPLOAD PLACING WORLD ");
            placeOBJInWorld("/"+ filename +".obj");
        }
    }
    
    function meshDataForPolyline(vertices, normals, colors, texCoords0, isInverted) {
        
        // algorithm to create indices
        var sequenceIndex = isInverted ? 1 : 0;
        
        // 0, 1, 2, 1, 3, 2, 2,3,4, 3, 5, 4
        var indices = [];
        for (var i = 0; i < vertices.length - 2; i++) {
            if (i % 2 === sequenceIndex) {
                indices.push(i);
                indices.push(i + 1);
                indices.push(i + 2);
            } else {
                indices.push(i);
                indices.push(i + 2);
                indices.push(i + 1);
            }
        }
    
        var mesh = {
            name: "PolylineWrap",
            topology: "triangles",
            indices: indices,
            positions: vertices,
            normals: normals,
            colors: colors,
            texCoords0: texCoords0
        };
        return mesh;
    }

    function addPolylinesFromSearch() {
        // clear selection
        clearPolylineList();
        // get new results
        var results = Entities.findEntities(MyAvatar.position, searchRadius);
        polylines = [];
        results.forEach(function(entity) {
            var entityName = Entities.getEntityProperties(entity, "type").type;
            if (entityName === "PolyLine") {
                polylines.push(entity);
            }
        });

        // update
        sendUpdate();
    }

    // tablet connection

    // onWebEventReceived function
    function onWebEventReceived(event) {
        if (!isWrapping) {
            print("ERROR: wrapping is deactivated.");
            return;
        }

        if (typeof event === "string") {
            event = JSON.parse(event);
        }
        
        // TODO : Deal with events
        switch (event.type) {
            case "removePolyline":
                print("Delete");
                var deletedIDs = removeSelectedPolylines();
                tablet.emitScriptEvent(JSON.stringify({
                    type: "polylinesRemoved",
                    ids: deletedIDs
                }));
                break;
            case "refreshPolylines":
                sendUpdate();
                break;
            case "radius":
                searchRadius = parseFloat(event.radius);
                print("Search Radius: " + (searchRadius + 0.01) );
                break;
            case "addSearch":
                print("Add Search: " + (searchRadius + 0.01) );
                addPolylinesFromSearch();
                break;
            case "exportobj":
                print("Export: " + (searchRadius + 0.01) );
                isPlacingOBJInWorld = false;
                exportOBJFromPolylines(false);
                break;
            case "exportplace":
                print("Export & Place: " + (searchRadius + 0.01) );
                isPlacingOBJInWorld = true;
                exportOBJFromPolylines(true);
                break;
            case "filenameChanged":
                if (event.value.length >= MIN_FILENAME_LENGTH ){
                    filename = event.value;
                    print("Changing filename: " + filename);
                }
                break;
            case "isUsingTextures":
                isUsingTextures = event.value;
                break;
            case "selectionUpdatePolylines":
                selectionManager.setSelections(event.entityIds);
                break;
            default:
                break;
        }
    }    
    
    function onTabletShownChanged() {
        if (_shouldRestoreTablet && tablet.tabletShown) {
            _shouldRestoreTablet = false;
           
            isWrapping = false;
            HMD.openTablet();
            onButtonClicked();
            HMD.openTablet();
        }
    }

    function onTabletScreenChanged(type, url) {
        var TABLET_SCREEN_WEB = "Web";
            
        isWrapping = type === TABLET_SCREEN_WEB && url.indexOf("html/polylineList.html") > -1;
        
        button.editProperties({ isActive: isWrapping });
    }

    // onButtonClicked function

    function onButtonClicked() {
    
        isWrapping = !isWrapping;

        if (!isWrapping) {
            selectionManager.clearSelections();
            tablet.gotoHomeScreen();
        }
        button.editProperties({ isActive: isWrapping });

        
        if (isWrapping) {
            tablet.gotoWebScreen(APP_URL);
            HMD.openTablet();
            addPolylinesFromSearch();
        }


    }

    // onHmdChanged 
    function onHmdChanged(isHMDActive) { 
        var wasHMDActive = Settings.getValue("wasHMDActive", null);        
        if (isHMDActive !== wasHMDActive) {
            Settings.setValue("wasHMDActive", isHMDActive);            
            if (wasHMDActive === null) {
                return;
            } else {
                if (isWrapping) {
                    _shouldRestoreTablet = true;
                    // Make sure the tablet is being shown when we try to change the window
                    while (!tablet.tabletShown) {
                        HMD.openTablet();
                    }
                } 
            }
        }
    }

    // Set up
    function setUp() {
        tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");
        if (!tablet) {
            return;
        }
        tablet.webEventReceived.connect(onWebEventReceived);
        // Tablet button.
        button = tablet.addButton({
            icon: CONTENT_PATH + "/html/icons/wrapping-i.svg",
            activeIcon: CONTENT_PATH + "/html/icons/wrapping-a.svg",
            text: BUTTON_NAME,
            isActive: isWrapping
        });

        button.clicked.connect(onButtonClicked);
        // Track whether tablet is displayed or not.
        tablet.screenChanged.connect(onTabletScreenChanged);
        tablet.tabletShownChanged.connect(onTabletShownChanged);
        HMD.displayModeChanged.connect(onHmdChanged);
    }

    // Tear Down
    function tearDown() {
        if (!tablet) {
            return;
        }
        selectionManager.clearSelections();

        tablet.webEventReceived.disconnect(onWebEventReceived);
        tablet.screenChanged.disconnect(onTabletScreenChanged);
        tablet.tabletShownChanged.disconnect(onTabletShownChanged);
        button.clicked.disconnect(onButtonClicked);
        tablet.removeButton(button);
    }

    setUp();
    Script.scriptEnding.connect(tearDown);    
}());    
