$(document).ready(function() {
  // Create an instance of our Play engine.
  var myPlay = new wcPlay({
    silent: false,
    updateRate: 10,
    updateLimit: 100,
    debugging: true,
  });

  // wcNodeComposite.extend('wcNodeCompositeTest', 'Test', 'Core', {
  //   init: function(parent, pos) {
  //     this._super(parent, pos);
  //     this.color = this.myCol;
  //   },
  //   myCol: "#FF0000",
  // });

  // wcNodeComposite.extend('wcNodeCompositeTest2', 'Test2', 'Core', {
  //   init: function(parent, pos) {
  //     this._super(parent, pos);
  //     this.color = this.myCol;
  //   },
  //   myCol: "#0000FF",
  // });

  // Create an instance of our script editor.
  var myPlayEditor = new wcPlayEditor('.playContainer', {
    readOnly: false,
  });

  // Assign the current Play script to be rendered.
  myPlayEditor.engine(myPlay);

  // Add some nodes.
  var startNode = new wcNodeEntryStart(myPlay, {x: 400, y: 30});
  var logNode = new wcNodeProcessConsoleLog(myPlay, {x: 400, y: 200});
  var delayNode = new wcNodeProcessDelay(myPlay, {x: 400, y: 400});
  var operationNode = new wcNodeProcessOperation(myPlay, {x: 400, y: 600});
  var numberNode = new wcNodeStorageNumber(myPlay, {x: 150, y: 600});

  // Tutorial nodes.
  var tutViewportNode = new wcNodeProcessTutorialViewport(myPlay, {x: 800, y: 200});
  var tutPropertyNode = new wcNodeProcessTutorialProperties(myPlay, {x: 800, y: 400});
  var tutDynamicNode = new wcNodeProcessTutorialDynamic(myPlay, {x: 800, y: 600});
  myPlayEditor.center();

  // Assign them all debug log enabled, so they will console log various events.
  // startNode.debugLog(true);
  // logNode.debugLog(true);
  // delayNode.debugLog(true);
  // operationNode.debugLog(true);
  // numberNode.debugLog(true);

  // Assign some property values.
  operationNode.initialProperty('valueB', 1);

  // Chain some nodes together.
  numberNode.connectOutput('value', operationNode, 'valueA');
  operationNode.connectOutput('result', numberNode, 'value');
  startNode.connectExit('out', logNode, 'in');
  logNode.connectExit('out', delayNode, 'in');
  delayNode.connectExit('out', operationNode, 'add');
  operationNode.connectExit('out', logNode, 'in');
  delayNode.connectExit('out', tutDynamicNode, 'change color');

  // Lets collapse all the nodes so they take up less space.
  startNode.collapsed(true);
  logNode.collapsed(true);
  delayNode.collapsed(true);
  operationNode.collapsed(true);
  numberNode.collapsed(true);

  myPlay.createProperty('Test property', wcPlay.PROPERTY_TYPE.STRING, 'Foo');
  myPlay.createProperty('ValueB', wcPlay.PROPERTY_TYPE.STRING, 'Asdf');

  // Start execution of the script.
  myPlay.start();
});