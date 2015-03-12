// Globals
var myApp = {};

$(function () {
  'use strict';

  myApp.map = null,
  myApp.locationBin = null,
  myApp.scale = null,
  myApp.pointFeature,
  myApp.ready = false,
  myApp.startTime = null;
  myApp.animationState = 0;

  myApp.map = geo.map({
          node: '#map',
          center: {
            x: -98.0,
            y: 39.5
          },
          zoom: 1
        });
  myApp.map.createLayer(
    'osm',
    {
      baseUrl: 'http://c.tile.stamen.com/terrain-labels/'
    }
  );

  // Aggregate data
  function aggregateByLocation(data) {
    var dataGroupedByLocation, key, min = 0, max = 1, newdata = [];
    myApp.locationBin = {};

    if (data) {
      data.forEach(function(item) {
        key = item.field7 + '|' + item.field6;
        if (key in myApp.locationBin) {
          myApp.locationBin[key].binCount = 1 + myApp.locationBin[key].binCount;
          if (myApp.locationBin[key].binCount > max) {
            max = myApp.locationBin[key].binCount
          }
        } else {
          item.binCount = 1;
          myApp.locationBin[key] = item;
          newdata.push(item);
        }
      });
    }

    return {"data": newdata, "min": min, "max": max};
  }

  // Query given a time duration
  function queryData(timerange, callback) {
    console.log("/api/v1/data?limit=100000&duration=["+timerange+"]");

    $.ajax("/api/v1/data?limit=100000&duration=["+timerange+"]")
      .done(function(data) {
        console.log(data.length);
        if (callback !== undefined) {
          callback(data);
        }
      })
      .fail(function(err) {
        console.log(err);
      })
  }

  // Create geovis
  function createVis(data, callback) {
    var aggdata = aggregateByLocation(data);
    console.log(aggdata);
    myApp.scale = d3.scale.linear().domain([aggdata.min, aggdata.max])
              .range([2, 100]);
    if (myApp.pointFeature === undefined) {
      myApp.pointFeature = myApp.map
                       .createLayer('feature')
                       .createFeature('point');
    }
    myApp.pointFeature
      .data(aggdata.data)
      .position(function (d) { return { x:d.field7, y:d.field6 } })
      .style('radius', function (d) { return myApp.scale(d.binCount); })
      .style('stroke', false)
      .style('fillOpacity', 0.4)
      .style('fillColor', "orange");

    myApp.map.draw();

    if (callback) {
      callback();
    }
  }

  // Create animation
  myApp.runAnimation = function(timestamp) {
    if (myApp.ready) {
      // First get the values from the slider
      var range = $( "#slider" ).slider( "values" ),
          min = $( "#slider" ).slider( "option", "min" ),
          max = $( "#slider" ).slider( "option", "max" ),
          delta = range[1] - range[0],
          newRange = [ range[ 0 ] + delta, range[ 1 ] + delta ];

      if (newRange[0] >= max) {
        newRange[0] = max;
        myApp.animationState = 0;
      }
      if (newRange[0] <= min) {
        newRange[0] = min;
        animationState = 0;
      }
      if (newRange[1] >= max) {
        newRange[1] = max;
        myApp.animationState = 0;
      }
      if (newRange[1] <= min) {
        newRange[1] = min;
        animationState = 0;
      }

      // Set the slider value
      $( "#slider" ).slider( "option", "values", newRange );

      // Query the data and create vis again
      queryData( newRange, function(data) {
        createVis(data, function() {
          if (myApp.animationState > 0) {
            window.requestAnimationFrame(myApp.runAnimation);
          }
        });
      });
    }
  }

  $.ajax( "/api/v1/data" )
    .done(function(range) {
    // return;

    // // Cache the data for later
    // mdata = data;
    // aggregateByLocation();
    // console.log(aggData);

    // Compute min and max for time
    var format = d3.time.format("%Y-%m-%d %H:%M:%S");
    // var minMax = [d3.min(aggData, function(d) {
    //     var date = format.parse(d.field4);
    //     if (date) {
    //       return date.getTime() / 1000
    //     }
    //   }), d3.max(aggData, function(d) {
    //     var date = format.parse(d.field4);
    //     if (date) {
    //       return date.getTime() / 1000
    //     }
    //   })];

    console.log(format.parse(range.duration.start.field4));
    console.log(format.parse(range.duration.end.field4));

    var min = format.parse(range.duration.start.field4);
    var max = format.parse(range.duration.end.field4);

    // Set the date range
    $( "#slider" ).slider({
      range: true,
      min: min.getTime()/1000,
      max: max.getTime()/1000,
      values: [ min.getTime()/1000, min.getTime()/1000 + 24 * 3600 * 180 ],
      slide: function( event, ui ) {
        queryData($("#slider").slider("values"), createVis);
      }
    });

    // Now query data
    queryData($("#slider").slider("values"), createVis);
    myApp.ready = true;
  })
  .fail(function() {
    console.log('failed');
  });

  $( "#slider" ).slider();
});


myApp.buttonBackPress = function() {
    // TODO implement this
}

myApp.buttonPlayPress = function() {
  myApp.animationState = 1;
  window.requestAnimationFrame(myApp.runAnimation);
}

myApp.buttonStopPress = function() {
  myApp.animationState = 0;
}

myApp.buttonForwardPress = function() {
  // TODO implement this
}