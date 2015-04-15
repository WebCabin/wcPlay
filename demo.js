$(document).ready(function() {
  var myPlay = new wcPlay({
    silent: false,
    updateRate: 25,
  });

  // Add some nodes.
  var startNode = new wcNodeEntryStart(myPlay);
  var logNode = new wcNodeProcessLog(myPlay);
  var delayNode = new wcNodeProcessDelay(myPlay);
  var storageNode = new wcNodeStorage(myPlay);

  startNode.debugLog(true);
  logNode.debugLog(true);
  delayNode.debugLog(true);
  storageNode.debugLog(true);

  storageNode.property('Value', 'Message changed by storage node!');

  storageNode.connectOutput('Value', logNode, 'Message');
  startNode.connectExit('Out', logNode, 'In');
  logNode.connectExit('Out', delayNode, 'In');
  delayNode.connectExit('Finished', logNode, 'In');

  myPlay.start();
});