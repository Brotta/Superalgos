﻿function newAAMastersPlottersTradingSimulationStrategies() {

    const MODULE_NAME = "Strategies Plotter";
    const INFO_LOG = false;
    const ERROR_LOG = true;
    const INTENSIVE_LOG = false;
    const logger = newWebDebugLog();
    logger.fileName = MODULE_NAME;

    let thisObject = {

        // Main functions and properties.

        initialize: initialize,
        finalize: finalize,
        container: undefined,
        fitFunction: undefined,
        getContainer: getContainer,
        setTimeFrame: setTimeFrame,
        setDatetime: setDatetime,
        draw: draw,
        recalculateScale: recalculateScale,

        /* Events declared outside the plotter. */

        onDailyFileLoaded: onDailyFileLoaded,

        // Secondary functions and properties.

        currentRecord: undefined
    };

    /* this is part of the module template */

    let container = newContainer();     // Do not touch this 3 lines, they are just needed.
    container.initialize();
    thisObject.container = container;

    let coordinateSystem = newCoordinateSystem();       // Needed to be able to plot on the timeline, otherwise not.

    let timeFrame;                     // This will hold the current Time Frame the user is at.
    let datetime;                       // This will hold the current Datetime the user is at.

    let marketFile;                     // This is the current Market File being plotted.
    let fileCursor;                     // This is the current File Cursor being used to retrieve Daily Files.

    let marketFiles;                      // This object will provide the different Market Files at different Time Frames.
    let dailyFiles;                // This object will provide the different File Cursors at different Time Frames.

    /* these are module specific variables: */

    let strategies = [];
    let strategyImages = [];

    let zoomChangedEventSubscriptionId
    let offsetChangedEventSubscriptionId
    let dragFinishedEventSubscriptionId
    let dimmensionsChangedEventSubscriptionId
    let marketFilesUpdatedEventSubscriptionId
    let dailyFilesUpdatedEventSubscriptionId

    return thisObject;

    function finalize() {
        try {

            if (INFO_LOG === true) { logger.write("[INFO] finalize -> Entering function."); }

            /* Stop listening to the necesary events. */

            canvas.chartSpace.viewport.eventHandler.stopListening(zoomChangedEventSubscriptionId);
            canvas.chartSpace.viewport.eventHandler.stopListening(offsetChangedEventSubscriptionId);
            canvas.eventHandler.stopListening(dragFinishedEventSubscriptionId);
            thisObject.container.eventHandler.stopListening(dimmensionsChangedEventSubscriptionId)
            marketFiles.eventHandler.stopListening(marketFilesUpdatedEventSubscriptionId);
            dailyFiles.eventHandler.stopListening(dailyFilesUpdatedEventSubscriptionId);

            /* Destroyd References */

            marketFiles = undefined;
            dailyFiles = undefined;

            datetime = undefined;
            timeFrame = undefined;

            marketFile = undefined;
            fileCursor = undefined;

            strategyImages = undefined;

            thisObject.fitFunction = undefined
        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] finalize -> err = " + err.stack); }
        }
    }

    function initialize(pStorage, pDatetime, pTimeFrame, callBackFunction) {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] initialize -> Entering function."); }

            /* Store the information received. */

            marketFiles = pStorage.marketFiles[0];
            dailyFiles = pStorage.dailyFiles[0];

            datetime = pDatetime;
            timeFrame = pTimeFrame;

            /* We need a Market File in order to calculate the Y scale, since this scale depends on actual data. */

            marketFile = marketFiles.getFile(ONE_DAY_IN_MILISECONDS);  // This file is the one processed faster. 

            recalculateScale();

            /* Now we set the right files according to current Period. */

            marketFile = marketFiles.getFile(pTimeFrame);
            fileCursor = dailyFiles.getFileCursor(pTimeFrame);

            /* Listen to the necesary events. */

            zoomChangedEventSubscriptionId = canvas.chartSpace.viewport.eventHandler.listenToEvent("Zoom Changed", onViewportZoomChanged);
            offsetChangedEventSubscriptionId = canvas.chartSpace.viewport.eventHandler.listenToEvent("Position Changed", onViewportPositionChanged);
            dragFinishedEventSubscriptionId = canvas.eventHandler.listenToEvent("Drag Finished", onDragFinished);
            marketFilesUpdatedEventSubscriptionId = marketFiles.eventHandler.listenToEvent("Files Updated", onMarketFilesUpdated);
            dailyFilesUpdatedEventSubscriptionId = dailyFiles.eventHandler.listenToEvent("Files Updated", onDailyFilesUpdated);

            /* Get ready for plotting. */

            recalculate();

            /* Ready for when dimmension changes. */

            dimmensionsChangedEventSubscriptionId = thisObject.container.eventHandler.listenToEvent('Dimmensions Changed', function () {
                recalculateScale()
                recalculate();
            })

            for (let i = 1; i < 15; i++) {
                let strategyImage = canvas.designerSpace.iconByUiObjectType.get('Strategy');   
                strategyImages.push(strategyImage);
            }

            callBackFunction();

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] initialize -> err = " + err.stack); }
        }
    }

    function getContainer(point) {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] getContainer -> Entering function."); }

            let container;

            /* First we check if this point is inside this space. */

            if (this.container.frame.isThisPointHere(point) === true) {

                return this.container;

            } else {

                /* This point does not belong to this space. */

                return undefined;
            }

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] getContainer -> err = " + err.stack); }
        }
    }

    function onMarketFilesUpdated() {
        try {
            let newMarketFile = marketFiles.getFile(timeFrame);
            if (newMarketFile !== undefined) {
                marketFile = newMarketFile;
                recalculate();
            }
        } catch (err) {
            if (ERROR_LOG === true) { logger.write("[ERROR] onMarketFilesUpdated -> err = " + err.stack); }
        }
    }

    function onDailyFilesUpdated() {
        try {
            let newFileCursor = dailyFiles.getFileCursor(timeFrame);
            if (newFileCursor !== undefined) {
                fileCursor = newFileCursor;
                recalculate();
            }
        } catch (err) {
            if (ERROR_LOG === true) { logger.write("[ERROR] onDailyFilesUpdated -> err = " + err.stack); }
        }
    }

    function setTimeFrame(pTimeFrame) {

        try {

            if (timeFrame !== pTimeFrame) {

                timeFrame = pTimeFrame;

                if (timeFrame >= _1_HOUR_IN_MILISECONDS) {

                    marketFile = marketFiles.getFile(pTimeFrame);

                    recalculate();

                } else {

                    let newFileCursor = dailyFiles.getFileCursor(pTimeFrame);

                    fileCursor = newFileCursor; // In this case, we explicitly want that if there is no valid cursor, we invalidate the data and show nothing.
                    recalculate();

                }
            }

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] setTimeFrame -> err = " + err.stack); }
        }
    }

    function setDatetime(pDatetime) {

        if (INFO_LOG === true) { logger.write("[INFO] setDatetime -> Entering function."); }

        datetime = pDatetime;

    }

    function onDailyFileLoaded(event) {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] onDailyFileLoaded -> Entering function."); }

            if (event.currentValue === event.totalValue) {

                /* This happens only when all of the files in the cursor have been loaded. */

                recalculate();

            }

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] onDailyFileLoaded -> err = " + err.stack); }
        }
    }

    function draw() {

        try {

            if (INTENSIVE_LOG === true) { logger.write("[INFO] draw -> Entering function."); }

            this.container.frame.draw();

            plotChart();

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] draw -> err = " + err.stack); }
        }
    }

    function recalculate() {

        try {

            strategies = []

            if (timeFrame >= _1_HOUR_IN_MILISECONDS) {

                recalculateUsingMarketFiles();

            } else {

                recalculateUsingDailyFiles();

            }

            thisObject.container.eventHandler.raiseEvent("Strategies Changed", strategies);

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] recalculate -> err = " + err.stack); }
        }
    }

    function recalculateUsingDailyFiles() {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] recalculateUsingDailyFiles -> Entering function."); }

            if (fileCursor === undefined) {
                strategies = [];
                return;
            } // We need to wait

            if (fileCursor.files.size === 0) {
                strategies = [];
                return;
            } // We need to wait until there are files in the cursor

            let daysOnSides = getSideDays(timeFrame);

            let leftDate = getDateFromPoint(canvas.chartSpace.viewport.visibleArea.topLeft, thisObject.container, coordinateSystem);
            let rightDate = getDateFromPoint(canvas.chartSpace.viewport.visibleArea.topRight, thisObject.container, coordinateSystem);

            let dateDiff = rightDate.valueOf() - leftDate.valueOf();

            let farLeftDate = new Date(leftDate.valueOf() - dateDiff * 1.5);
            let farRightDate = new Date(rightDate.valueOf() + dateDiff * 1.5);

            let currentDate = new Date(farLeftDate.valueOf());

            strategies = [];



            while (currentDate.valueOf() <= farRightDate.valueOf() + ONE_DAY_IN_MILISECONDS) {

                let stringDate = currentDate.getFullYear() + '-' + pad(currentDate.getMonth() + 1, 2) + '-' + pad(currentDate.getDate(), 2);

                let dailyFile = fileCursor.files.get(stringDate);

                if (dailyFile !== undefined) {

                    for (let i = 0; i < dailyFile.length; i++) {

                        let record = {
                            begin: undefined,
                            end: undefined,
                            status: undefined,
                            number: undefined,
                            beginRate: undefined,
                            endRate: undefined
                        };

                        record.begin = dailyFile[i][0];
                        record.end = dailyFile[i][1];
                        record.status = dailyFile[i][2];
                        record.number = dailyFile[i][3];
                        record.beginRate = dailyFile[i][4];
                        record.endRate = dailyFile[i][5];

                        if (record.begin >= farLeftDate.valueOf() && record.end <= farRightDate.valueOf()) {

                            strategies.push(record);

                            if (datetime.valueOf() >= record.begin && datetime.valueOf() <= record.end) {

                                thisObject.currentRecord = record;
                                thisObject.container.eventHandler.raiseEvent("Current Strategy Changed", thisObject.currentRecord);

                            }
                        }
                    }
                }

                currentDate = new Date(currentDate.valueOf() + ONE_DAY_IN_MILISECONDS);
            }

            /* Lests check if all the visible screen is going to be covered by strategies. */

            let lowerEnd = leftDate.valueOf();
            let upperEnd = rightDate.valueOf();

            setTimeout(recalculate, 2000);

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] recalculateUsingDailyFiles -> err = " + err.stack); }
        }
    }

    function recalculateUsingMarketFiles() {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] recalculateUsingMarketFiles -> Entering function."); }

            if (marketFile === undefined) { return; } // Initialization not complete yet.

            let daysOnSides = getSideDays(timeFrame);

            let leftDate = getDateFromPoint(canvas.chartSpace.viewport.visibleArea.topLeft, thisObject.container, coordinateSystem);
            let rightDate = getDateFromPoint(canvas.chartSpace.viewport.visibleArea.topRight, thisObject.container, coordinateSystem);

            let dateDiff = rightDate.valueOf() - leftDate.valueOf();

            leftDate = new Date(leftDate.valueOf() - dateDiff * 1.5);
            rightDate = new Date(rightDate.valueOf() + dateDiff * 1.5);

            strategies = [];

            for (let i = 0; i < marketFile.length; i++) {

                let record = {
                    begin: undefined,
                    end: undefined,
                    status: undefined,
                    number: undefined,
                    beginRate: undefined,
                    endRate: undefined
                };

                record.begin = marketFile[i][0];
                record.end = marketFile[i][1];
                record.status = marketFile[i][2];
                record.number = marketFile[i][3];
                record.beginRate = marketFile[i][4];
                record.endRate = marketFile[i][5];

                if (record.begin >= leftDate.valueOf() && record.end <= rightDate.valueOf()) {

                    strategies.push(record);

                    if (datetime.valueOf() >= record.begin && datetime.valueOf() <= record.end) {

                        thisObject.currentRecord = record;
                        thisObject.container.eventHandler.raiseEvent("Current Strategy Changed", thisObject.currentRecord);

                    }
                }
            }

            //console.log("Olivia > recalculateUsingMarketFiles > total strategies generated : " + strategies.length);

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] recalculateUsingMarketFiles -> err = " + err.stack); }
        }
    }

    function recalculateScale() {

        try {

            if (coordinateSystem.maxValue > 0) { return; } // Already calculated.

            let minValue = {
                x: MIN_PLOTABLE_DATE.valueOf(),
                y: 0
            };

            let maxValue = {
                x: MAX_PLOTABLE_DATE.valueOf(),
                y: nextPorwerOf10(MAX_DEFAULT_RATE_SCALE_VALUE) / 4 // TODO: This 4 is temporary
            };


            coordinateSystem.initialize(
                minValue,
                maxValue,
                thisObject.container.frame.width,
                thisObject.container.frame.height
            );

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] recalculateScale -> err = " + err.stack); }
        }
    }

    function plotChart() {

        try {

            let userPosition = getUserPosition()
            let userPositionDate = userPosition.point.x

            thisObject.container.eventHandler.raiseEvent("Current Strategy Record Changed", undefined);

            let record;

            for (let i = 0; i < strategies.length; i++) {

                record = strategies[i];

                let recordPoint1 = {
                    x: record.begin,
                    y: record.beginRate
                };

                let recordPoint2 = {
                    x: record.end,
                    y: record.endRate
                };

                let recordPoint3 = {
                    x: record.begin,
                    y: record.beginRate
                };

                let recordPoint4 = {
                    x: record.end,
                    y: record.endRate
                };

                recordPoint1 = coordinateSystem.transformThisPoint(recordPoint1);
                recordPoint2 = coordinateSystem.transformThisPoint(recordPoint2);
                recordPoint3 = coordinateSystem.transformThisPoint(recordPoint3);
                recordPoint4 = coordinateSystem.transformThisPoint(recordPoint4);

                recordPoint1 = transformThisPoint(recordPoint1, thisObject.container);
                recordPoint2 = transformThisPoint(recordPoint2, thisObject.container);
                recordPoint3 = transformThisPoint(recordPoint3, thisObject.container);
                recordPoint4 = transformThisPoint(recordPoint4, thisObject.container);

                if (recordPoint2.x < canvas.chartSpace.viewport.visibleArea.bottomLeft.x || recordPoint1.x > canvas.chartSpace.viewport.visibleArea.bottomRight.x) {
                    continue;
                }

                recordPoint3.y = recordPoint1.y + 2000;
                recordPoint4.y = recordPoint1.y + 2000;

                recordPoint1 = canvas.chartSpace.viewport.fitIntoVisibleArea(recordPoint1);
                recordPoint2 = canvas.chartSpace.viewport.fitIntoVisibleArea(recordPoint2);
                recordPoint3 = canvas.chartSpace.viewport.fitIntoVisibleArea(recordPoint3);
                recordPoint4 = canvas.chartSpace.viewport.fitIntoVisibleArea(recordPoint4);

                recordPoint1 = thisObject.fitFunction(recordPoint1, undefined, 30);
                recordPoint2 = thisObject.fitFunction(recordPoint2, undefined, 30);
                recordPoint3 = thisObject.fitFunction(recordPoint3, undefined, 30);
                recordPoint4 = thisObject.fitFunction(recordPoint4, undefined, 30);

                let imageSize = 20;
                let imageToDraw = strategyImages[record.number];

                
                    /* Draw the line that represents the duration of closed strategy */

                    browserCanvasContext.beginPath();

                    browserCanvasContext.moveTo(recordPoint3.x + imageSize / 2, recordPoint3.y);
                    browserCanvasContext.lineTo(recordPoint4.x - imageSize / 2, recordPoint4.y);

                    browserCanvasContext.closePath();

                    browserCanvasContext.strokeStyle = 'rgba(' + UI_COLOR.MANGANESE_PURPLE + ', 1)';
                    browserCanvasContext.lineWidth = 1

                    if (record.status === 1) {
                        browserCanvasContext.setLineDash([0, 0])
                    } else {
                        browserCanvasContext.setLineDash([2, 4])
                    }
                    browserCanvasContext.stroke()
                 


                drawStick(recordPoint1, recordPoint3);
                drawStick(recordPoint2, recordPoint4);

                if (imageToDraw.canDrawIcon === true) {
                    browserCanvasContext.drawImage(imageToDraw, recordPoint3.x - imageSize / 2, recordPoint3.y - imageSize / 2, imageSize, imageSize);
                    if (record.status === 1) {
                        browserCanvasContext.drawImage(imageToDraw, recordPoint4.x - imageSize / 2, recordPoint4.y - imageSize / 2, imageSize, imageSize);
                    }
                }

                /* Send the current record to the panel */

                if (userPositionDate >= record.begin && userPositionDate <= record.end) {

                    let currentRecord = {
                    };
                    thisObject.container.eventHandler.raiseEvent("Current Strategy Record Changed", currentRecord);
                }

                function drawStick(point1, point2) {

                    browserCanvasContext.beginPath();

                    browserCanvasContext.moveTo(point1.x, point1.y);
                    browserCanvasContext.lineTo(point2.x, point2.y);

                    browserCanvasContext.closePath();

                    browserCanvasContext.strokeStyle = 'rgba(' + UI_COLOR.DARK + ', 0.25)';

                    if (userPositionDate >= record.begin && userPositionDate <= record.end) {

                        /* highlight the current record */
                        browserCanvasContext.strokeStyle = 'rgba(' + UI_COLOR.TITANIUM_YELLOW + ', 1)'; // Current record accroding to time
                    }

                    browserCanvasContext.setLineDash([4, 3])
                    browserCanvasContext.lineWidth = 0.5
                    browserCanvasContext.stroke()
                    browserCanvasContext.setLineDash([0, 0])

                }
            }

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] plotChart -> err = " + err.stack); }
        }
    }


    function onViewportZoomChanged(event) {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] onViewportZoomChanged -> Entering function."); }

            recalculate();

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] onViewportZoomChanged -> err = " + err.stack); }
        }
    }

    function onViewportPositionChanged(event) {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] onViewportPositionChanged -> Entering function."); }

            if (event !== undefined) {
                if (event.recalculate === true) {
                    recalculate()
                    return
                }
            }
            if (Math.random() * 100 > 95) {
                recalculate()
            };

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] onViewportPositionChanged -> err = " + err.stack); }
        }
    }

    function onDragFinished() {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] onDragFinished -> Entering function."); }

            recalculate();

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] onDragFinished -> err = " + err.stack); }
        }
    }
}




















