(function($) { // run code when document is ready
    var map, pos, marker, comment, radioValue, index,infowindow, clickedItem, newListObject,
    locationArray, clickedLoacation, latlng, zip, address, number, city;
    var selectedMin = 1;
    var selectedMax = 5;
    var restaurants = [];
    var visibleRestaurants = [];
    var markers = [];
    var comments = [];
  
    $.ajax({ //request JSON data
      url: '../json/restaurants.json',
      type: 'GET',
      success: function(data) {
        restaurants = data; // store data in restaurants array
      }
    });
    $.ajaxPrefilter(function(options) { // NodeJS proxy which adds CORS headers to the proxied request
      if (options.crossDomain && jQuery.support.cors) {
          options.url = 'https://cors-anywhere.herokuapp.com/' + options.url;
      }
    });
    $.ajax({ // request more restaurants from google's API within certain radius
      url: 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=48.1114778,11.5334491&radius=1000&type=restaurant&key=AIzaSyBEwSOrtZcNLDrLWVKBsTUq_yHDW3wBYU4',
      type: 'GET',
      dataType: 'json',
      success: function(data) {
        callback(data.results); // pass results into callback function
      },
      error: function(jqXHR, textStatus, errorThrown) {
        console.log('jqXHR: ' + jqXHR + 'textStatus: ' + 'errorThrown: ' + errorThrown);
      }  
    })

    // generate new map
    window.initMap = function() {
        map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: -34.397, lng: 150.644},
        zoom: 15, 
        scrollwheel: false 
      });
  
      // Try HTML5 geolocation.
      if (navigator.geolocation) {
          // if geolocation works, store position in pos object
          navigator.geolocation.getCurrentPosition(function(position) {
            pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          // set map center to user's position
          map.setCenter(pos);
        
        
          
          // display user's current position as flag icon
          var image = 'https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png';
          var flagMarker = new google.maps.Marker({
            position: {lat: pos.lat, lng: pos.lng},
            map: map,
            icon: image
          });

          
          checkBounds(map); // check which restaurant's from list are within viewport and store in visible array
          placeMarkers(map); // place markers for visible restaurants
          setUpList(); // set up initial list, adding the coresponding data to each list element
  
          bind('center_changed', map);
          bind('zoom_changed', map);
  
          function bind(eventName, map){ // when map center is changed or map is zoomed, update markers and list
            google.maps.event.addListener(map, eventName, function() {
              refreshListAndMap(map);
            });
          }
        });
      } 
      else {
        // if browser doesn't support Geolocation
        document.getElementById('map').innerHTML = "Geolocation is not supported by this browser.";
      }


      var geocoder = new google.maps.Geocoder;
  
      // get lat and long of user's click on map 
      google.maps.event.addListener(map, 'click', function (e) {
  
        locationArray = [e.latLng.lat(), e.latLng.lng()];
        clickedLoacation = ([e.latLng.lat(), e.latLng.lng()]).toString();
        geocodeLatLng(geocoder, map);
      });
    }

    function callback(results) {
      
        for (var i = 0; i < results.length; i++) { // loop through all received results
          // create new object for each
          var newRestaurant = 
      
          {
            "restaurantName": results[i].name,
            "address": results[i].vicinity,
            "lat": results[i].geometry.location.lat,
            "long": results[i].geometry.location.lng,
            "ratings":[
              {
                  "stars": parseInt(results[i].rating),
                  "comment": null
              }  
            ]
          }
          restaurants.push(newRestaurant); // push each new restaurant into restaurants array
        }
      
    }


    function geocodeLatLng(geocoder, map) {
      var latlngStr = clickedLoacation;
      latlngStr = latlngStr.split(',', 2);
      latlng = {lat: parseFloat(latlngStr[0]), lng: parseFloat(latlngStr[1])};
      geocoder.geocode({'location': latlng}, function(results, status) {
        if (status === 'OK') {
          if (results[1]) {
             // loop through result to get address, number, city and zip 
            $.each(results[0].address_components, function() {
              switch(this.types[0]){
                  case "postal_code":
                      zip = this.short_name;
                      break;
                  case "route":
                      address = this.short_name;
                      break;
                  case "street_number":
                      number = this.short_name;
                      break;    
                  case "locality":
                      city = this.short_name;
                      break;                  
              }
            });
          } else {
            window.alert('No results found');
          }
        } else {
          window.alert('Geocoder failed due to: ' + status);
        }
      });
    }
    
    class NewRestaurantObject {
        constructor(item) {
            this.name = item.getAttribute("data-name");
            this.lat = item.getAttribute('data-lat');
            this.long = item.getAttribute('data-long');
            this.id = item.getAttribute('id');
            this.average = item.getAttribute('data-average');
            this.ratings = item.getAttribute('data-ratings');
            this.stars = item.getAttribute('data-stars');
        }

        showRestaurantInfo() {
  
            updateList(); // update average rating for each list item
        
            $('#reviews').text(''); // clear any visible ratings
           
            showStreetView(new google.maps.LatLng(this.lat, this.long)); // show clicked restaurant's street view
           
            $('#restName').text(this.name); // display clicked restaurant's name  
            setModal(this.name); // set modal title
        
            markers[this.id]['infowindow'].open(map, markers[this.id]); // open restaurant's marker's info window

            $('#reviews').append(this.ratings); // show ratings and comments of selected element
            
            //$('#restaurantInfo').removeClass('d-none'); // show restaurant info div
            //$('#rateButton').removeClass('invisible'); // show 'review this restaurant' button
            $('#restaurantInfoModal').modal('show'); 
            
        }
    }
  
    $( '#list').on('click', 'li.list-group-item', function(e) { // event listener for click on list item
      $( "li.list-group-item" ).removeClass('active');
      $(this).addClass('active');

      
      closeInfoWindow();
      clickedItem = e.target

      newListObject = new NewRestaurantObject(clickedItem); // turn clicked item into restaurant object 

      newListObject.showRestaurantInfo(); // show restaurant's info
    });
  
    $( "#slider-range" ).on( "slidechange", function( event, ui ) { //event listener for slider change
      selectedMin = $( "#slider-range" ).slider( "values", 0 ); // store selected minimum star value in variable
      selectedMax = $( "#slider-range" ).slider( "values", 1 ); // store selected maximum star value in variable
  
      refreshListAndMap(map);
  });
  
    function checkBounds(map) {
      for( i = 0; i < restaurants.length; i++ ) {
        position = new google.maps.LatLng(restaurants[i].lat, restaurants[i].long); // define restaurant's position
        if(map.getBounds().contains(position) === true) { // if restaurant's position is within viewport
          visibleRestaurants.push(restaurants[i]); // push into visible array
        }
      }
    }
  
    function setUpList() {
  
      // Create the list element:
      var list = document.createElement('ul');
  
      for(var i = 0; i < visibleRestaurants.length; i++) {
        
        setAverage(); // calculate each restaurant's rating average
        
        // Create the list item:
        var item = document.createElement('li');
  
        // Set its contents:
        item.appendChild(document.createTextNode(visibleRestaurants[i].restaurantName + ': ' + visibleRestaurants[i].average + ' out of 5 stars'));
        item.setAttribute('data-lat', visibleRestaurants[i].lat);
        item.setAttribute('data-long', visibleRestaurants[i].long);
        item.setAttribute('data-name', visibleRestaurants[i].restaurantName);
        item.setAttribute('id', i);
        item.setAttribute('data-average', visibleRestaurants[i].average);
        
        
        var text = ""; // set text variable to empty string
        var stars = [];
  
        for (var j = 0; j < visibleRestaurants[i].ratings.length; j++) { // loop through each restaurant's ratings
          stars.push(visibleRestaurants[i].ratings[j].stars); // push each star into stars array
          
          if (visibleRestaurants[i].ratings[j].comment != null) { // if restaurant has comments, create review text
            // define its text content by appending all ratings
            text += '<p>' + visibleRestaurants[i].ratings[j].stars + " out of 5 stars" + '<br>' + '<q>' + visibleRestaurants[i].ratings[j].comment + '</q>' + '</p>';
          }
          
        } 
    
        item.setAttribute('data-ratings', text);
        item.setAttribute('data-stars', stars);
  
        // add new item to the list
        list.appendChild(item);
      }
      // insert the constructed list into DOM
      document.getElementById('list').appendChild(list); // show visible marker in list
      $('ul').addClass('list-group'); // add bootstrap classes
      $('li').addClass('list-group-item');
    }
  
    function emptyList() {
      $('#list').text('');
    }
  
    function updateList() {
      var average;
      // loop through all list items and set the average displayed in the list to that stored in the item itself
      $('li').each(function () {
        average = this.getAttribute('data-average')
        $('#' + (this.getAttribute('id'))).text(this.getAttribute('data-name') + ': ' + average + ' out of 5 stars');
      });
    }
  
    function refreshListAndMap(map) {
      var activeRestaurantName = clickedItem.getAttribute('data-name'); // before deleting list, store current clicked item's name 
      
      emptyList() // empty existing list
      deleteMarkers(map); // delete all markers (also empties all arrays)
      
      checkBounds(map) // check which restaurant's from list are within viewport and store in visible array
      setAverage(); // calculate the average rating for each visible restaurant
      
      // select from the visible restaurants only those that match the selected filter values (default 1 - 5)
      visibleRestaurants = visibleRestaurants.filter((restaurant) => restaurant.average >= selectedMin && restaurant.average <= selectedMax);
      setUpList(); // show list of restaurants within range

      for (var restaurant in visibleRestaurants) { // loop through all visible restaurants
        if (visibleRestaurants.restaurantName === activeRestaurantName) { // if previously clicked rest. is in new list
          $("[data-name='" + activeRestaurantName + "']").addClass('active'); // find restaurant which was active in list before creating new list and set it active

          var currentActiveItem = $('.list-group-item.active'); // find activ item from list a
          currentActiveItem[0].scrollIntoView(); // scroll it into view
        }
      }

      placeMarkers(map); // place markers 
    }
  
    function setAverage () { // calculates each restaurant's average star rating
      var avgRating = 0
      for(var i = 0; i < visibleRestaurants.length; i++) { // loop through all restaurants

        for (var j = 0; j < visibleRestaurants[i].ratings.length; j++) { // loop through each restaurant's ratings
                  
          avgRating += visibleRestaurants[i].ratings[j].stars; // add ratings
        }
        avgRating = avgRating/visibleRestaurants[i].ratings.length // divide by number of ratings
        avgRating = Math.round( avgRating * 10) / 10 // round to one decimal
        visibleRestaurants[i].average = avgRating; // add average Rating property to each visible restaurant
        avgRating = 0; // set average rating variable back to zero 
      }
        
    }
  
    function placeMarkers(map) { // creates markers, stores them in array and places them on map
      var position;
      //var infowindow = new google.maps.InfoWindow({}); // create new info window
      for( i = 0; i < visibleRestaurants.length; i++ ) { // loop through array of restaurants
        position = new google.maps.LatLng(visibleRestaurants[i].lat, visibleRestaurants[i].long); // define restaurant's position
  
        marker = new google.maps.Marker({ // create marker for each restaurant
          position: position,
          map: map,  
          title: visibleRestaurants[i].restaurantName
        });
  
        marker['infowindow'] = new google.maps.InfoWindow({ // create individual info window for each marker
          content: marker.title // set its content to restaurant's name
        });
        
        markers.push(marker); // push marker into markers array
  
        google.maps.event.addListener(marker, 'click', (function(marker, i) { // event listener for marker
          return function() {
            closeInfoWindow();
            //map.setCenter(new google.maps.LatLng(markers[i].position.lat(), markers[i].position.lng())); // center map around clicked marker
            markers[i]['infowindow'].open(map, markers[i]); // open marker's info window
  
            activateListItem(i); // set corresponding list item as 'active'

            clickedItem.scrollIntoView(); // scroll clicked item in list into view
          }
        }) (marker, i)); 
      } 
    }
  
    function activateListItem(i) {
        // set marker's coresponding list item to active and proceed with sequence as if user has clicked on this specific list item
        var corespondingListItem = $('#' + i); // (marker and list item share same index)
        clickedItem = corespondingListItem[0];

        // turn clicked item into object by passing items attributes as properties
        newListObject = new NewRestaurantObject(clickedItem);

        newListObject.showRestaurantInfo();

        $( "li.list-group-item" ).removeClass('active'); // add class active to coresponding list item
        $(clickedItem).addClass('active'); 
    }
  
    function deleteMarkers(map) { // delete all markers, empty markers array and visible restaurants array
        for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(null);
        }
        markers = [];
        visibleRestaurants = [];
    }
  
    function showStreetView(position) {
      var panorama = new google.maps.StreetViewPanorama( // new street view object
        document.getElementById('streetView'), 
        {
          position: position, // set viewport to postion of clicked marker
          pov: { heading: 34, pitch: 10}
        });
    }
    
   
    $("#slider-range").slider({ // filter slider jQuery
      range: true,
      min: 1,
      max: 5,
      values: [ 1, 5 ],
      slide: function( event, ui ) {
        $( "#amount" ).val( 'Filter: ' + ui.values[ 0 ] + " stars - " + ui.values[ 1 ] + " stars" );
      }
    });
    $( "#amount" ).val('Filter: ' + $( "#slider-range" ).slider("values", 0 ) + " stars - " + $( "#slider-range" ).slider( "values", 1 ) + " stars" );  
    
  
    function setModal(name) { // set modals title to restaurant's name
      $('.modal-title').text('How was your expierence at ' + name + '?');
    }
  
    $('#modalForm').on('submit', function(event) { // event listener for review modal submit button
      addReview(event);
    });
  
    $('#addButton').on('click', function() { // event listener for adding new restaurant button
      if (locationArray === undefined) {
        alert('Please click on the location in the map, then click the "Add your favorite restaurant" button. We\'ll find the righ address for you. \uD83D\uDE01');
      }
      else {
        $('#addRestaurant').modal("show")
        $('#inputAddress').val(address + ' ' + number);
        $('#inputCity').val(city);
        $('#inputZip').val(zip);
      }
    });
  
    $('#addForm').on('submit', function(event) { // event listener for add restaurant modal submit button
      event.preventDefault();
  
      var newRestaurantName = $("#inputName").val();
      var radioValue = parseInt($("#radio2 .custom-control-input:checked").val()); // store values in variables 
      var comment = $("#commentField2").val();
      
      infowindow = new google.maps.InfoWindow; // place new marker with info window 
      var marker = new google.maps.Marker({
        position: latlng,
        map: map
      });

      markers.push(marker); // push new marker into markers array 
      infowindow.setContent(newRestaurantName);
      infowindow.open(map, marker);
  
      $("#addRestaurant").modal('hide'); // close modal
  
      // create new JSON object
      var newRestaurant = 
  
      {
        "restaurantName": newRestaurantName,
        "address": address + ' ' + number + ", " + city,
        "lat": locationArray[0],
        "long": locationArray[1],
        "ratings":[
           {
              "stars": radioValue,
              "comment": comment
           }  
        ]
      }
  
      restaurants.push(newRestaurant); // push new restaurant object into restaurants array
      refreshListAndMap(map); // refresh to display new restaurant in list and marker on map
      var newItem = ($( "li" ).last())[0]; // get new list item from DOM 
      $( "li.list-group-item" ).removeClass('active'); 
      $(newItem).addClass('active'); // set new list item as active

      newItem.scrollIntoView(); // scroll it into view
       
      // turn new item into object by passing items attributes as properties
       newListObject = new NewRestaurantObject(newItem);
       
       newListObject.showRestaurantInfo(); // show info of new list object in restaurant info div

       $('#addForm').trigger('reset'); // rest the modal 
  
    });
    
    
    function addReview(event) {
        event.preventDefault();
        radioValue = parseInt($(".custom-control-input:checked").val()); // store values in variables 
        comment = $("#commentField").val();
  
  
        var newRating = '<p>' + radioValue + " out of 5 stars" + '<br>' + '<q>' + comment + '</q>' + '</p>'; // store new ratings in variable
        newListObject.ratings += newRating;
        $('#reviews').text(''); // empty ratings div
        $('#reviews').append(newListObject.ratings); // show new ratings and comments of new Object
      
  
        clickedItem.setAttribute('data-stars', clickedItem.getAttribute('data-stars') + ',' + radioValue); // add new star to element
        newListObject.stars = newListObject.stars + ',' + radioValue;
        var starString = newListObject.stars // store all star ratings in variable
        starString = starString.replace(/,/g, ""); // remove commas from string
        
        var stars = [];
        for(var i = 0; i < starString.length; i++) {
          stars.push(parseInt(starString[i])); // parse string as integer and store all number in stars array
        }
  
        // calculate average rating from stars array
        var average = 0;
  
        for (var i = 0; i < stars.length; i++) {
          average += stars[i]; // add ratings
        }
  
        average = average/stars.length; // divide by number of ratings
        average = Math.round( average * 10) / 10 // round to one decimal
  
        newListObject.average = average; // set new average rating for element
        visibleRestaurants[newListObject.id].ratings.push({stars: radioValue, comment: comment}); /* push ratings into array 
        (when user zooms or adjusts slider, new array with restaurants within bounds contains new ratings --> necessary for setUpMap function) */
  
        $('#' + (newListObject.id)).text(newListObject.name + ': ' + average + ' out of 5 stars'); // update text in list with new average rating
        clickedItem.setAttribute('data-average', average); // set new average rating for element
        
        console.log(clickedItem);
  
        $('#modal').modal('hide'); // close modal
        $('#modalForm').trigger('reset'); // rest the modal
        
        refreshListAndMap(map); // refresh to display new review 
        markers[newListObject.id]['infowindow'].open(map, markers[newListObject.id]); // open restaurant's marker's info window
    }

  
    function closeInfoWindow() { // close all open info windows
      $.each(markers, function(i) {
        markers[i]['infowindow'].close(map, markers[i]);
      }); 
    }

  })(jQuery);
  
  
  
  
  
  