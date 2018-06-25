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
        _isTabletDisplayed = false,
        isWrapping = false;

    var searchRadius = 2;

    // onWebEventReceived function
    function onWebEventReceived(event){
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
            case "export":
                print("Export: " + (searchRadius + 0.01) );
                break;
            case "exportplace":
                print("Export & Place: " + (searchRadius + 0.01) );
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
