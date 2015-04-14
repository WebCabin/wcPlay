$(document).ready(function() {
  var myPlay = new wcPlay();

  // Add some nodes.
  var startNode = new wcNodeEntryStart(myPlay);
  var logNode = new wcNodeProcessLog(myPlay);
  // var logNode2 = new wcNodeProcessLog(myPlay);
  var delayNode = new wcNodeProcessDelay(myPlay);
  var dataNode = new wcNodeStorage(myPlay);

  startNode.debugLog(true);
  logNode.debugLog(true);
  // logNode2.debugLog(true);
  delayNode.debugLog(true);
  dataNode.debugLog(true);

  // logNode2.property('Message', 'Right after delay node!');
  dataNode.property('Value', 'Message changed by storage node!');

  dataNode.connectOutput('Value', logNode, 'Message');
  startNode.connectExit('Out', logNode, 'In');
  logNode.connectExit('Out', delayNode, 'In');
  // delayNode.connectExit('Finished', logNode, 'In');
  // delayNode.connectExit('Out', logNode2, 'In');

  myPlay.start();
});