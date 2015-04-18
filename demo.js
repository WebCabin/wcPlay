$(document).ready(function() {
  // Create an instance of our Play engine.
  var myPlay = new wcPlay({
    silent: false,
    updateRate: 10,
    updateLimit: 100,
    debugging: true,
  });

  // Create an instance of our script editor.
  var myPlayEditor = new wcPlayEditor('.playContainer', {
    readOnly: false,
  });

  // Assign the current Play script to be rendered.
  myPlayEditor.engine(myPlay);

  // Add some nodes.
  var startNode = new wcNodeEntryStart(myPlay, {x: 400, y: 30});
  var logNode = new wcNodeProcessLog(myPlay, {x: 400, y: 200});
  var delayNode = new wcNodeProcessDelay(myPlay, {x: 400, y: 400});
  var operationNode = new wcNodeProcessOperation(myPlay, {x: 400, y: 600});
  var storageNode = new wcNodeStorage(myPlay, {x: 150, y: 650});

  // Assign them all debug log enabled, so they will console log various events.
  // startNode.debugLog(true);
  // logNode.debugLog(true);
  // delayNode.debugLog(true);
  // operationNode.debugLog(true);
  // storageNode.debugLog(true);

  // Assign some property values.
  storageNode.property('value', 0);
  operationNode.property('valueB', 1);

  // Chain some nodes together.
  storageNode.connectOutput('value', operationNode, 'valueA');
  operationNode.connectOutput('result', storageNode, 'value');
  startNode.connectExit('out', logNode, 'in');
  logNode.connectExit('out', delayNode, 'in');
  delayNode.connectExit('finished', operationNode, 'add');
  operationNode.connectExit('out', logNode, 'in');

  // Lets collapse all the nodes so they take up less space.
  startNode.collapsed(true);
  logNode.collapsed(true);
  delayNode.collapsed(true);
  operationNode.collapsed(true);
  storageNode.collapsed(true);

  // Start execution of the script.
  myPlay.start();

  // setTimeout(function() {
  //   operationNode.debugBreak(true);
  // }, 500);

  $('body').on('keyup', function(event) {
    switch (event.keyCode) {
      // Space to step
      case 32:
        myPlay.paused(false);
        myPlay.stepping(true);
        break;
      // Enter to continue;
      case 13:
        myPlay.paused(false);
        myPlay.stepping(false);
        break;
      // Esc disable pausing.
      case 27:
        myPlay.debugging(!myPlay.debugging());
        myPlay.paused(false);
        myPlay.stepping(false);
        break;
    };
  });
});