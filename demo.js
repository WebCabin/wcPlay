$(document).ready(function() {
  // Create an instance of our Play engine.
  var myPlay = new wcPlay({
    silent: false,
    updateRate: 25,
  });

  // Create an instance of our canvas renderer.
  var myPlayRenderer = new wcRenderCanvas('.playContainer', {
    readOnly: false,
  });

  // Assign the current Play script to be rendered.
  myPlayRenderer.engine(myPlay);

  // Add some nodes.
  var startNode = new wcNodeEntryStart(myPlay, {x: 50, y: -100});
  var logNode = new wcNodeProcessLog(myPlay, {x: 50, y: 0});
  var delayNode = new wcNodeProcessDelay(myPlay, {x: 50, y: 100});
  var storageNode = new wcNodeStorage(myPlay, {x: -50, y: 0});

  // Assign them all debug log enabled, so they will console log various events.
  startNode.debugLog(true);
  logNode.debugLog(true);
  delayNode.debugLog(true);
  storageNode.debugLog(true);

  // Assign a value to the storage node.
  storageNode.property('Value', 'Message changed by storage node!');

  // Chain some nodes together.
  storageNode.connectOutput('Value', logNode, 'Message');
  startNode.connectExit('Out', logNode, 'In');
  logNode.connectExit('Out', delayNode, 'In');
  // delayNode.connectExit('Finished', logNode, 'In');

  // Start execution of the script.
  myPlay.start();
});