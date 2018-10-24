//
//  hand.js
//
//  Created by David Rowe on 21 Jul 2017.
//  Copyright 2017 High Fidelity, Inc.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

/* global Hand:true, MyAvatarUtils */



Hand = function (side) {

    "use strict";

    

    // Hand controller input.
    var handController,
        controllerTrigger,
        controllerTriggerClicked,
        controllerGrip,

        isGripClicked = false,
        isGripClickedHandled = false,
        GRIP_ON_VALUE = 0.99,
        GRIP_OFF_VALUE = 0.95,

        isTriggerPressed,
        isTriggerClicked,
        TRIGGER_ON_VALUE = 0.15, // Per controllerDispatcherUtils.js.
        TRIGGER_OFF_VALUE = 0.1, // Per controllerDispatcherUtils.js.
        TRIGGER_CLICKED_VALUE = 1.0,
// 0.05
        NEAR_GRAB_RADIUS = 0.05, // Different from controllerDispatcherUtils.js.
        NEAR_HOVER_RADIUS = 0.025,

        LEFT_HAND = 0,
        HALF_TREE_SCALE = 16384,

        handPose,
        handJointIndex,
        handPosition,
        handOrientation,
        palmPosition,
        HAND_TO_PALM_OFFSET = { x: 0, y: 0.1, z: 0.02 },

        handleOverlayIDs = [],
        intersection = {};

    if (!(this instanceof Hand)) {
        return new Hand(side);
    }

    if (side === LEFT_HAND) {
        handController = Controller.Standard.LeftHand;
        controllerTrigger = Controller.Standard.LT;
        controllerTriggerClicked = Controller.Standard.LTClick;
        controllerGrip = Controller.Standard.LeftGrip;
    } else {
        handController = Controller.Standard.RightHand;
        controllerTrigger = Controller.Standard.RT;
        controllerTriggerClicked = Controller.Standard.RTClick;
        controllerGrip = Controller.Standard.RightGrip;
    }

    function setHandJoint() {
        handJointIndex = MyAvatarUtils.handJointIndex(side);
    }
    setHandJoint();

    function setHandleOverlays(overlayIDs) {
        handleOverlayIDs = overlayIDs;
    }

    function valid() {
        return handPose.valid;
    }

    function position() {
        return handPosition;
    }

    function orientation() {
        return handOrientation;
    }

    function getPalmPosition() {
        return palmPosition;
    }

    function triggerPressed() {
        return isTriggerPressed;
    }

    function triggerClicked() {
        return isTriggerClicked;
    }

    function gripClicked() {
        return isGripClicked;
    }

    function setGripClickedHandled() {
        isGripClicked = false;
        isGripClickedHandled = true;
    }

    function getIntersection() {
        return intersection;
    }

    function getNearGrabRadius() {
        return NEAR_GRAB_RADIUS;
    }

    function update() {
        var gripValue;


        // Hand data.
        handPosition = Vec3.sum(MyAvatar.position, Vec3.multiplyQbyV(MyAvatar.orientation,
            MyAvatar.getAbsoluteJointTranslationInObjectFrame(handJointIndex)));
        handOrientation = Quat.multiply(MyAvatar.orientation, MyAvatar.getAbsoluteJointRotationInObjectFrame(handJointIndex));
        palmPosition = Vec3.sum(handPosition, Vec3.multiplyQbyV(handOrientation, HAND_TO_PALM_OFFSET));

        // Controller trigger.
        isTriggerPressed = Controller.getValue(controllerTrigger) > (isTriggerPressed
            ? TRIGGER_OFF_VALUE : TRIGGER_ON_VALUE);
        isTriggerClicked = Controller.getValue(controllerTriggerClicked) === TRIGGER_CLICKED_VALUE;

        // Controller grip.
        gripValue = Controller.getValue(controllerGrip);
        if (isGripClicked) {
            isGripClicked = gripValue > GRIP_OFF_VALUE;
        } else {
            isGripClicked = gripValue > GRIP_ON_VALUE;
        }
        // Grip clicked may be being handled by UI.
        if (isGripClicked) {
            isGripClicked = !isGripClickedHandled;
        } else {
            isGripClickedHandled = false;
        }

        
    }

    function clear() {
        // Nothing to do.
    }

    function destroy() {
        // Nothing to do.
    }

    return {
        setHandJoint: setHandJoint,
        setHandleOverlays: setHandleOverlays,
        valid: valid,
        position: position,
        orientation: orientation,
        palmPosition: getPalmPosition,
        triggerPressed: triggerPressed,
        triggerClicked: triggerClicked,
        gripClicked: gripClicked,
        setGripClickedHandled: setGripClickedHandled,
        intersection: getIntersection,
        getNearGrabRadius: getNearGrabRadius,
        update: update,
        clear: clear,
        destroy: destroy
    };
};

Hand.prototype = {};
