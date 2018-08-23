//
//  fingerPaint.js
//
//  Created by Daniela Fontes on 14 Mar 2018
//  Copyright 2018 High Fidelity, Inc.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

var results = Entities.findEntities(
    MyAvatar.position,
    10
);
var polyline = null;
var polylines = [];

results.forEach(function(entity) {
    var entityName = Entities.getEntityProperties(entity, "type").type;
    if (entityName === "PolyLine") {
        // get access to polyline entity properties
        
        polyline = Entities.getEntityProperties(entity); 
        print("Daantje : " + polyline.textures);
        polylines.push(polyline);

    }
});

// Test Graphics API


var meshData = {
    name: "myName",
    topology: "triangles",
    //topology: "strip",
    // question does it start with 0?
    // answer: yes
    // triangles are formed clock-wise
    indices: [0,1,2,1,3,2,2,3,4,3,5,4],
    // this should be vertices
    // vertices are calculated in local space
    positions: [{x: 0, y:0, z:0}, {x: 0, y:5, z:0},{x: 5, y:0, z:0}, {x: 5, y:5, z:0}, {x: 10, y:0, z:0}, {x: 10, y:5, z:0}],
    // 
    normals: [{x: 0, y:0, z:1}, {x: 0, y:0, z:1}, {x: 0, y:0, z:1}, {x: 0, y:0, z:1}, {x: 0, y:0, z:1}, {x: 0, y:0, z:1}],
    // colors
    colors: [{red: 255, green: 0, blue: 0}, {red: 255, green: 0, blue: 0}, {red: 255, green: 0, blue: 0}, {red: 255, green: 0, blue: 0}, {red: 255, green: 0, blue: 0}, {red: 255, green: 0, blue: 0}],
    // texCoods0 texCoords0
    texCoords0: [{x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0},{x: 0, y: 0}, {x: 0, y: 0}]
    // texCoords0: [{u: 0, v: 0}, {u: 0, v: 1}, {u: 1, v: 0}, {u: 1, v: 1},{u: 0, v: 0}, {u: 0, v: 1}]
};

var mesh = Graphics.newMesh(meshData);

var model = Graphics.newModel([mesh]);

// convert polyline linePoints to vertices
if (polylines.length >= 1) {
    var meshes = [];
    var initialPosition = undefined;
    var meshOffset = Vec3.ZERO;
    polylines = [polylines[0]];
    var mtls = [];
    var textures = [];
    var polylineIndex = 0;
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
        
        var vertices = [];
        var invVertices = [];
        var normalsForVertices = [];
        
        var inverseNormalsForVertices = [];
        var colorsForVertices = [];
        var texCoords0ForVertices = [];
        var binormal;
        var tangent;
        var i;
        var isUVModeStretch = polyline.isUVModeStretch;
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
            invVertices.push(Vec3.sum(Vec3.sum(linePoints[i], binormal), Vec3.multiply(-1, normals[i])));
            invVertices.push(Vec3.sum(Vec3.subtract(linePoints[i], binormal), Vec3.multiply(-1, normals[i])));
            
            normalsForVertices.push(normals[i]);
            normalsForVertices.push(normals[i]);

            inverseNormalsForVertices.push(Vec3.multiply(-1, normals[i]));
            inverseNormalsForVertices.push(Vec3.multiply(-1, normals[i]));

            // Color

            var c = {x: 0, y: 0.0, z: 0.0};
            if (colors.length > 1) {
                colorsForVertices.push(colors[i]);
                colorsForVertices.push(colors[i]);
            } else {
                c.x = polyline.color.red / 256;
                c.y = polyline.color.green / 256;
                c.z = polyline.color.blue / 256;
                colorsForVertices.push(c);
                colorsForVertices.push(c);
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

        print("UVs " + JSON.stringify(texCoords0ForVertices));
        meshes.push( 
            Graphics.newMesh(
                meshDataForPolyline(vertices, normalsForVertices, colorsForVertices, texCoords0ForVertices)
            )
        );
        meshes.push(
            Graphics.newMesh(
                meshDataForPolylineInv(vertices, normalsForVertices, colorsForVertices, texCoords0ForVertices)
            )
        );

        mtls.push("usemtl polyline"+ polylineIndex);
        textures.push(polyline.textures);

        polylineIndex++;
       
    });

    var number = Math.floor(Math.random() * Math.floor(666));
    model = Graphics.newModel(meshes);

    //print("New model: " + Graphics.exportModelToOBJ(model));
    var mtl = "";
    var obj = Graphics.exportModelToOBJ(model);
    obj = obj.replace( "writeOBJToTextStream", ("writeOBJToTextStream\nmtllib "+"testmodelwrap"+ number +".mtl") );
    for (var i = 0 ; i< mtls.length; i++) {
        obj = obj.replace( ("faces::subMeshIndex " +i*2) , ("faces::subMeshIndex " +i*2 +"\n" + mtls[i]) );
        obj = obj.replace( ("faces::subMeshIndex " +(i*2+1)) , ("faces::subMeshIndex " +(i*2+1) +"\n" + mtls[i]) );

        
        var request = new XMLHttpRequest();
        request.onreadystatechange = function() {
            print("ready state: ", request.readyState, request.status, request.readyState === request.DONE, request.response);
            if (request.readyState === request.DONE && request.status === 200) {
                print("Got response for high score: "+ request.response);
                Assets.putAsset({
                    data: request.response,
                    path: "testmodelwrap"+ number+ "/texture"+i 
                }, uploadDataCallback);
            }
        };
        request.responseType = 'blob';
        request.open('GET', "http://mpassets.highfidelity.com/d3985860-e94a-42d8-aa1f-c498b2cebabd-v1/content/brushes/heart.png" );
        request.timeout = 10000;
        request.send();

        // Assets.putAsset({
        //     data: Script.resolvePath("http://mpassets.highfidelity.com/d3985860-e94a-42d8-aa1f-c498b2cebabd-v1/content/brushes/heart.png"),
        //     path: "/testmodelwrap"+ number+ "/texture"+i +".png"
           
        // }, uploadDataCallback);

        // mtl += "newmtl polyline"+ i + "\nKd 1.00 1.00 1.00\nmap_Kd " + "/testmodelwrap"+ number+ "/texture"+i +".png"+ "\n";


        mtl += "newmtl polyline"+ i + "\nillum 4\nKd 0.00 0.00 0.00\nKa 0.00 0.00 0.00\nTf 1.00 1.00 1.00\nmap_Kd " + "map_Kd_T_Chair_paint_01.jpg"+ "\nNi 1.00\n";
        //mtl += "newmtl polyline"+ i + "\nKd 0.00 0.00 0.00\nmap_Kd " + textures[i]+ "\n";
    }
    print("New model here : " + obj);
    print("New mtl here : " + mtl);

    print("Conver t " + Script.resolvePath("http://mpassets.highfidelity.com/d3985860-e94a-42d8-aa1f-c498b2cebabd-v1/content/brushes/heart.png") );
    
    Assets.putAsset({
        data: mtl,
        path: "/testmodelwrap"+ number +".mtl"
    }, uploadDataCallback);

    Assets.putAsset({
        data: obj,
        path: "/testmodelwrap"+ number +".obj"
    }, uploadDataCallback);

    var entityID = Entities.addEntity({
        type: "Model",
        modelURL: "atp:/testmodelwrap"+ number +".obj",
        position: Vec3.sum(MyAvatar.position, Vec3.multiplyQbyV(MyAvatar.orientation, { x: 0, y: 0.75, z: -5 })),
        dimensions: { x: 1, y: 1, z: 1 },
        dynamic: true,
        collisionless: false,
        userData: "{ \"grabbableKey\": { \"grabbable\": true, \"kinematic\": false } }",
        lifetime: 300  // Delete after 5 minutes.
    });

    // var materialID = Entities.addEntity({
    //     type: "Material",
    //     parentID: entityID,
    //     materialURL: "http://mpassets.highfidelity.com/d3985860-e94a-42d8-aa1f-c498b2cebabd-v1/content/brushes/heart.png",
    //     priority: 1,
    //     materialData: JSON.stringify({
    //         materialVersion: 1,
    //         materials: {
    //             // Can only set albedo on a Shape entity.
    //             // Value overrides entity's "color" property.
    //             emissiveMap: "http://mpassets.highfidelity.com/d3985860-e94a-42d8-aa1f-c498b2cebabd-v1/content/brushes/heart.png" // Yellow
    //         }
    //     })
    // });
}





function uploadDataCallback(url, hash) {
    print("" + url);
    print(JSON.stringify(hash));
}

function meshDataForPolyline(vertices, normals, colors, texCoords0) {
    
    // algorithm to create indices
    
    // 0, 1, 2, 1, 3, 2, 2,3,4, 3, 5, 4
    var indices = [];
    for (var i = 0; i < vertices.length - 2; i++) {
        if (i % 2 === 0) {
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
    }
    return mesh;
}

function meshDataForPolylineInv(vertices, normals, colors, texCoords0) {
    
    // algorithm to create indices
    
    // 0, 1, 2, 1, 3, 2, 2,3,4, 3, 5, 4
    var indices = [];
    for (var i = 0; i < vertices.length - 2; i++) {
        if (i % 2 === 1) {
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
    }
    return mesh;
}

