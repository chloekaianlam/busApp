$(function(){

	var map,
		geocoder,
		$submit = $('#submit'),
		$busStopPane = $('.bus-stop-pane'),
		$searchField = $('.search-field'),
		$infoPane = $('.info-pane'),
		$backBtn = $('.backBtn');

	// Initialising Google Maps API
	function initialise() {
		geocoder = new google.maps.Geocoder();

		var mapOptions = {
		  center: new google.maps.LatLng( 51.520311, -0.126318 ),
		  zoom: 13
		};
		map = new google.maps.Map( document.getElementById("map-canvas"), mapOptions );

        convertAddress();

        // Finding user current location, targetting browsers and devices that support Geolocation
        if ( navigator.geolocation ) {
		  var timeoutVal = 10 * 1000 * 1000;
		  navigator.geolocation.getCurrentPosition(
		    displayPosition, 
		    displayError,
		    { enableHighAccuracy: true, timeout: timeoutVal, maximumAge: 0 }
		  );
		}
		else {
		  alert("Geolocation is not supported by this browser");
		}

		function displayPosition( position ) {
		  console.log("Latitude: " + position.coords.latitude + ", Longitude: " + position.coords.longitude);
		}

		function displayError( error ) {
		  var errors = { 
		    1: 'Permission denied',
		    2: 'Position unavailable',
		    3: 'Request timeout'
		  };
		  alert("Error: " + errors[error.code]);
		}
	}

	// Using Geocoding to filter bounding box region and retrieve bus data for specific region
	function convertAddress() {
		$submit.on('click', function( event ) {
			event.preventDefault();

		    var address = document.getElementById("address").value,
		    	userInput = '<h2>Results for ' + address + '</h2>';

		    geocoder.geocode( { 'address': address}, function( results, status ) {
		      if ( status == google.maps.GeocoderStatus.OK ) {
		        var north = results[0].geometry.viewport.getNorthEast().lat();
				var south = results[0].geometry.viewport.getSouthWest().lat();
				var east  = results[0].geometry.viewport.getNorthEast().lng();
				var west  = results[0].geometry.viewport.getSouthWest().lng();

				var url = 'https://digitaslbi-id-test.herokuapp.com/bus-stops?'+ 'northEast='+ north +','+ east +'&southWest='+ south +','+ west +'';

				$searchField.val('');

				getBusData( url );

				// Using viewport property to fit results in bounding box
				if (results[0].geometry.viewport) {
          			map.fitBounds(results[0].geometry.viewport);
          		}

		      } else {
		        alert("Geocode was not successful for the following reason: " + status);
		      }
		    });

		    $busStopPane.empty().append( userInput ).show();
			$infoPane.hide();
		});
	}

	// Retrieving bus stop data, display markers for its location
	function getBusData( url ) {
		$.ajax({
		   	type: 'GET',
		   	url: url,
		    async: false,
		    jsonpCallback: 'callback',
		    contentType: "application/json",
		    dataType: 'jsonp',
		    success: function( data ) {
		       	// Bus data is successfully retrieved here

		       	// Specific bus stop data for each associated info window
	            var	infowindow = new google.maps.InfoWindow({
	            	content: ""
	            });

		       	// Using for loop to go through all bus stops available from json
		       	for (var i = 0; i < data.markers.length; i++) {
			        var busStops = data.markers[i],
			        	lat = busStops.lat,
			        	lng = busStops.lng,
			        	// Both latitude and longitude is successfully retrieved
			        	id = busStops.id,
			        	name = busStops.name,
			        	stop = busStops.stopIndicator,
			        	info = '<p>Name: ' + '<a class="bus-stop" href="" data-id=" '+ id +'">' + name + '</a>' + '</p>' + '<p class="bus-detail">Stop Indicator: ' + stop + '</p><hr />';

			        $busStopPane.append( info );

			        getBusArrivals( url, marker, map, id, stop );

			        // Displaying markers from latitude and longitude
		          	var marker = new google.maps.Marker({
		                position: new google.maps.LatLng( lat, lng ),
		                map: map,
		                draggable: false,
		                animation: google.maps.Animation.DROP
			        });

			        bindInfoWindow( marker, map, infowindow, name );
		        }

		        return false;

		    },
		    error: function( jqXHR, textStatus, errorThrown ){
        		console.log("errorThrown: " + errorThrown);
		    }
		});
	}

	// Dealing with specific bus stop data by matching id 
	function getBusArrivals( url, marker, map, id, stop ) {

    	$('.bus-stop').on('click', function( event ) {
    		event.preventDefault();

    		var busID = $(this).data('id'),
    			stopLetter = '<h2>Bus Stop: ' + stop + '</h2>',
				busTime = 'https://digitaslbi-id-test.herokuapp.com/bus-stops/' + id;

    		$.ajax({
			   	type: 'GET',
			   	url: busTime,
			    async: false,
			    contentType: "application/json",
			    dataType: 'jsonp',
			    success: function( busData ) {

			    	for (var i = 0; i < busData.arrivals.length; i++) {
        
				    	var busInfo = busData.arrivals[i],
				    		busNum = busInfo.routeId,
				    		lastUpdated = busInfo.lastUpdated,
				    		destination = busInfo.destination,
				    		estimatedWait = busInfo.estimatedWait,
				    		scheduledTime = busInfo.scheduledTime,
				    		busDetails = '<p>Bus number: ' + busNum + '</p>' + '<p>Destination: ' + destination + '</p>' + '<p>Estimated wait: ' + estimatedWait + '</p>' + '<p>Schedule Time: ' + scheduledTime + '</p><hr />';

				    	$infoPane.append( busDetails );
				    	$('#' + busID).slideToggle();

				    }
			    },
			    error: function( jqXHR, textStatus, errorThrown ){
	        		console.log("errorThrown: " + errorThrown);
			    }
			});

    		$busStopPane.hide();
			$infoPane.empty().show();
			$backBtn.fadeIn(1500);

    	});

		backButton();
    }

    // Display info window for each bus stop, fix for only displaying the last iteration
    function bindInfoWindow( marker, map, infowindow, strDescription ) {
        google.maps.event.addListener(marker, 'click', function() {
        	var html = strDescription;
        	console.log(html);
        	infowindow.setContent( html );
		    infowindow.open( map, marker );
		});
	}

	// Going back to search results 
	function backButton() {
		$backBtn.on('click', function() {
			$('.bus-stop-pane').show();
			$infoPane.hide();
			$backBtn.hide();
		});
	}

	google.maps.event.addDomListener(window, 'load', initialise);

}());