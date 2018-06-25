//
//  wrap.js
//
//  Created by Daniela Fontes on 25 Jun 2018
//  Copyright 2018 High Fidelity, Inc.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

(function () {
    var tablet,
        button,
        BUTTON_NAME = "WRAP",
        SCRIPT_PATH = Script.resolvePath(''),
        CONTENT_PATH = SCRIPT_PATH.substr(0, SCRIPT_PATH.lastIndexOf('/')),
        APP_URL = CONTENT_PATH + "/html/polylineList.html";
    
    var _isTabletFocused = false,
        _shouldRestoreTablet = false,
        _isTabletDisplayed = false;
    // onWebEventReceived function
    
    // onTabletScreenChanged function

    // onTabletShownChanged function

    // onButtonClicked function

    // onHmdChanged 
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
            text: BUTTON_NAME
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
