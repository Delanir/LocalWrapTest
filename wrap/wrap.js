//
//  wrap.js
//
//  Created by Daniela Fontes on 25 Jun 2018
//  Copyright 2018 High Fidelity, Inc.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

/* global Tablet, Entities, Vec3, Graphics, Script, Quat, Assets, HMD */

(function () {
    var tablet,
        button,
        BUTTON_NAME = "WRAP",
        SCRIPT_PATH = Script.resolvePath(''),
        CONTENT_PATH = SCRIPT_PATH.substr(0, SCRIPT_PATH.lastIndexOf('/')),
        APP_URL = CONTENT_PATH + "/html/polylineList.html";
    
    var _shouldRestoreTablet = false,
        isWrapping = false;

    // web
    var MIN_FILENAME_LENGTH = 4;
    var searchRadius = 2;
    var filename = "testObject";

    var polylines = [];
    
    function placeOBJInWorld() {

    }

    function exportOBJFromPolylines(isPlacingInWorld) {
        var model;
        // convert polyline linePoints to vertices
        if (polylines.length >= 1) {
            var meshes = [];
            var initialPosition = undefined;
            var meshOffset = Vec3.ZERO;
            polylines.forEach(function(polyline) {
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
            });
            model = Graphics.newModel(meshes);
            
            Assets.putAsset({
                data: Graphics.exportModelToOBJ(model),
                path: "/"+ filename +".obj"
            }, uploadDataCallback);

            if (isPlacingInWorld) {
                placeOBJInWorld();
            }
        } else {
            print("No Polylines Selected.");
        }
    }

    function uploadDataCallback(url, hash) {
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
            case "delete":
                print("Delete");
                break;
            case "refresh":
                print("Refresh");
                break;
            case "radius":
                searchRadius = parseFloat(event.radius);
                print("Search Radius: " + (searchRadius + 0.01) );
                break;
            case "addSearch":
                print("Add Search: " + (searchRadius + 0.01) );
                break;
            case "exportobj":
                print("Export: " + (searchRadius + 0.01) );
                exportOBJFromPolylines(false);
                break;
            case "exportplace":
                print("Export & Place: " + (searchRadius + 0.01) );
                exportOBJFromPolylines(true);
                break;
            case "filenameChanged":
                if (event.value.length >= MIN_FILENAME_LENGTH ){
                    filename = event.value;
                    print("Changing filename: " + filename);
                }
                break;
            default:
                break;
        }
    }    
    
    function onTabletShownChanged() {
        if (_shouldRestoreTablet && tablet.tabletShown) {
            _shouldRestoreTablet = false;
            _isTabletFocused = false; 
            isWrapping = false;
            HMD.openTablet();
            onButtonClicked();
            HMD.openTablet();
        }
    }

    function onTabletScreenChanged(type, url) {
        var TABLET_SCREEN_CLOSED = "Closed";
        var TABLET_SCREEN_WEB = "Web";
            
        _isTabletDisplayed = type !== TABLET_SCREEN_CLOSED;
        isWrapping = type === TABLET_SCREEN_WEB && url.indexOf("html/polylineList.html") > -1;
        
        button.editProperties({ isActive: isWrapping });
    }

    // onButtonClicked function

    function onButtonClicked() {
    
        isWrapping = !isWrapping;

        if (!isWrapping) {
            tablet.gotoHomeScreen();
        }
        button.editProperties({ isActive: isWrapping });

        
        if (isWrapping) {
            tablet.gotoWebScreen(APP_URL);
            HMD.openTablet();
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
                    //Make sure the tablet is being shown when we try to change the window
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
            icon: "icons/tablet-icons/finger-paint-i.svg",
            activeIcon: "icons/tablet-icons/finger-paint-a.svg",
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

        tablet.screenChanged.disconnect(onTabletScreenChanged);
        tablet.tabletShownChanged.disconnect(onTabletShownChanged);
        button.clicked.disconnect(onButtonClicked);
        tablet.removeButton(button);
    }

    setUp();
    Script.scriptEnding.connect(tearDown);    
}());    
