
var app = app || {};

//--events manager
app.events = (function() {

	var publish = function (name, o) {
       
        console.log("EVENT [" + name + "]", o);
        $(document).trigger(name, [o]);
    
    };

    var subscribe = function (name, callback) {
        
        $(document).on(name, function(event, o){            
            callback(o);
        });

    };

    return {
    	publish : publish,
    	subscribe : subscribe
    }; 

})();

//--tracking manager
app.track = (function(){
		
	var obj = {};
		obj.user = {'finger': '', 'geoLat': 0, 'geoLon': 0, 'city' : '', 'geoNabe': '', 'geoBoro': '', 'geoName': '', 'geoType': ''};
		obj.articleClick = {'name': '', 'url': '', 'keys': [], 'tweet': false, 'instapaper': false, 'email': false, 'copy': false, 'ct': false};
		obj.search = { 'terms': []};
		//dropDown: { term: String, resultKeys: [String] },
	
	var submit = function(){
		var query = JSON.stringify(obj);

		console.log('tracking');
		app.database.init('track', query);
		//console.log('TRACKING COMMENTED OUT');
		
		//clear article info
		obj.articleClick = {'name': '', 'url': '', 'keys': [], 'tweet': false, 'instapaper': false, 'email': false, 'copy': false, 'ct': false};
		obj.search = { 'terms': []};
		
	};
	
	var subscribe = function(){
		app.events.subscribe('story:track', submit);
		
	};
	
	subscribe();	
		
	return {
		obj : obj 
	}
		
})();

//---user manager 
app.user = (function(){

	//get time
	var time = function(){
		var d = new Date();
		var hh = d.getHours();
		var mm = d.getMinutes();
		if(mm < 10){mm = '0' + mm;}
		var ss = d.getSeconds();
		if(ss < 10){ss = '0' + ss;}
		var full = hh + ":" + mm + ":" + ss;
		return full;
	};
	
	//get date
	var date = function(){
		var d = new Date();
		var yy = d.getFullYear();
		var mm = d.getMonth()+1;
		if(mm < 10){mm = '0' + mm;}
		var dd = d.getDate();
		if(dd < 10){dd = '0' + dd;}
		var full = yy + "-" + mm + "-" + dd;
		return full;
	};
	
	//get fingerprint for user
	var fp = function(){
		var fingerprint = new Fingerprint({canvas: true}).get();
		return fingerprint;
	};
	
	//define location variables
	var nabe = '',
		boro = '',
		lat = '',
		lng = '',
		name = 'here',
		type = '';
	
	//pull nabe + boro from google api
	var getNabe = function(p){
		
		//get user's lat/lng
	    lat = p.coords.latitude;
	    lng = p.coords.longitude;
	  	
	  	var url = 'http://maps.googleapis.com/maps/api/geocode/json?latlng='+ lat +','+ lng +'&sensor=true';	
		//gp	var url = 'http://maps.googleapis.com/maps/api/geocode/json?latlng=40.7310412,-73.9585554&sensor=true';
		//d12	var url = 'http://maps.googleapis.com/maps/api/geocode/json?latlng=40.737047,-73.992206&sensor=true'; 
		//ues	var url = 'http://maps.googleapis.com/maps/api/geocode/json?latlng=40.770556,-73.956730&sensor=true'; 
		
		//gmaps api call to get nabe + boro
	  	jQuery.ajax({
		    url: url,
		    success: function(result) {		
		    				
				var num = result.results.length - 1;				

				var hood = [];
				var i;
				for(i = num; i > -1; i--){
					if(result.results[i].types[0] == 'neighborhood'){
						hood.unshift(result.results[i].address_components[0].long_name);						
					}
					if(result.results[i].types[0] == 'sublocality'){
						app.user.boro = result.results[i].address_components[0].long_name;
					}
				}

			    app.user.nabe = hood[0];
						    
			    var publishLoc = "You are in " + app.user.nabe + ", " + app.user.boro + ".";
				
				app.events.publish('location:ready', publishLoc);
						
				//call foursquare for loc check in
				exploreNabe();	

		    }
		});

	};
	
	//pull/sort/append venue list from foursquare
	var exploreNabe = function(){
		
		var pos = lat + "," + lng;
		var url = 'https://api.foursquare.com/v2/venues/search?ll='+ pos+'&client_id=***&client_secret=***&v=20131016'
		

		
		//preparing functions for venue list jquery resp
		var namePullCount = 0;
			optBuildCount = 0,
			venueTotal = 0,
			initialList = [],
			finalList = [];
		
		var sortVenues = function(){
			finalList.sort(function(a,b) {
			    return a.text.localeCompare(b.text);
			});
			buildVenueList();
			
		};
		
		var addVenueOptions = function(elem, index, array){
			name = elem.name.toString();
			var o = new Option(name, elem.type);	
			$(o).html(name);
			finalList.push(o);
			optBuildCount++;
			
			if(optBuildCount == venueTotal){
				sortVenues();
			};
			
		};

		var pullName = function(element, index, array){
			namePullCount++;
					
			if(element.name){
				var name = element.name,
					type = 'Unknown';
				
				if(element.categories[0]){
					type = element.categories[0].name;
				}
								
				var v = {"name": name, "type" : type};	
				initialList.push(v);
				
				if(namePullCount == venueTotal){
					initialList.forEach(addVenueOptions);
				};
			};

		};
		
		var buildVenueList = function(){

			//add spacer
			o = new Option('', '#');	
			$(o).html('');
			finalList.push(o);
	
			//add "none" option
			o = new Option('None of these', '#');	
			$(o).html('None of these');
			finalList.push(o);
			
			//append array
			$(".location").append(finalList);
			$(".location").css('opacity', '1');
			$("#nabeload").fadeTo("fast", 0);
			var location = $('select.location');
			location.change(function(data){
				
				var selected = $(this).find('option:selected');
				app.user.name = selected[0].text.replace("'", "");
				app.user.type = selected[0].value;
				
				var publishLoc = 'Location is ' + app.user.name + ', which is a ' + app.user.type;
				app.events.publish('location:selected', publishLoc);
				
				track();
				$(".landing").fadeOut('fast');			
				
				
				
			});
	
		};
		
		//call foursquare to get list of locations
		$.getJSON( url, function( data ) {
			var venues = data.response.venues;
			var num = venues.length-1;

			var test = [];
			
			venueTotal = venues.length;
			venues.forEach(pullName);
										
		});

	};
	
	var track = function(){
	
		app.track.obj.user = {'finger': fp(), 'geoLat': lat, 'geoLon': lng, 'city' : 'NYC', 'geoNabe': app.user.nabe, 'geoBoro': app.user.boro, 'geoName': app.user.name, 'geoType': app.user.type};
		app.events.publish('track:updated', 'Obj.User updated');
	};
		
	var init = function(){
		navigator.geolocation.getCurrentPosition(getNabe);
		//console.log('time: ', time());
		//console.log('date: ', date());
		//console.log('fp: ', fp());
	};
	
	return {
		init : init,
		nabe : nabe,
		boro : boro,
		name : name
	}
	
})();

//--mongodb manager
app.database = (function(){

	var response =  '',
		baseurl = 'http://peaceful-spire-5824.herokuapp.com/';
		//baseurl = 'http://localhost:5000/';

	//find in article collection
	var find = function(query, callback, errorcallback){
		
		if(typeof(query) == "object"){
			query = JSON.stringify(query);
		};

	
		$.ajax({
			type: "GET",
			dataType: 'json',
			url: baseurl + 'find/' + query,
		}).success(function(data) {
			if(data.status == 204){
				app.events.publish('load:stop', '');
				//data = [{"cat" : "No Results", "storyURL" : "#", "hed" : "Sorry, no articles match your query."}];
				data = [];
				data = JSON.stringify(data);	
			}
			response = data;
			callback(data);
			
		});


	};
	
	//find in user collection
	var user = function(query, callback, errorcallback){
	
		if(typeof(query) == "object"){
			query = JSON.stringify(query);
		};
						
		$.ajax({
			type: "GET",
			dataType: 'json',
			url: baseurl + 'user/' + query,
			
		}).success(function(data) {
			if(data.status == 204){
				console.log(data.msg);
				app.events.publish('feed:no_results', data.msg);
				app.events.publish('load:stop', '');
			}else{
				callback(data);
				//console.log('done');
				//console.log(data);
			};
		});
			
	};
	
	//find content in article colletion for list of urls
	var list = function(query, callback, errorcallback){
			
		if(typeof(query) == "object"){
			query = JSON.stringify(query);
		};

	
		$.ajax({
			type: "GET",
			dataType: 'json',
			url: baseurl + 'list/' + query,
		}).success(function(data) {
			if(data.status == 204){
				console.log(data.msg);
				app.events.publish('feed:no_results', data.msg);
				app.events.publish('load:stop', '');
			}else{
				response = data;
				callback(data);
				//console.log(data);
			};
		});


		
	};
	
	//track in user collection.	
	var track = function(query, callback, errorcallback){
		
		
		$.ajax({
			url: baseurl + 'track/' + query,
		}).success(function(data) {
				response = data;
				callback(data);
				//console.log('done');
				//console.log(data);
		});
		
	};
	
	var init = function(call, query, callback, errorcallback){
		
		if(!callback){callback = function(){}};
		if(!errorcallback){errorcallback = function(){}};
		
		
		switch(call){
			case 'user':
				user(query, callback, errorcallback);
			break;
			
			case 'list':
				list(query, callback, errorcallback);
			break;
			
			case 'find':
				find(query, callback, errorcallback);
			break;
			
			case 'track':
				track(query, callback, errorcallback);
			break;		
		};	
		
	};
	
	return {		
		init : init,
	};


})();

//--nav manager
app.nav = (function(){
	
	var feed = [];
	
	//--nav display
	//build nav bar with user's location
	var build = function(){
		$('option#here').text(app.user.name);
		$('option#nabe').text(app.user.nabe);
		$('option#boro').text(app.user.boro);
		readyCheck();	
	};	
		
	//check to see if nav bar was built
	var readyCheck = function(){
		var loc,
			place,
			txt,
			newWidth;
		
		loc = $('select#locationType').find('option:selected').val();
		place = $('select#locationType').find('#here').val();

		//resize divs
		txt = $('select#newsType').find('option:selected').text();
		newWidth = ruler(txt);
		$('#newsType').width(newWidth);

		txt = $('select#locationType').find('option:selected').text();
		newWidth = ruler(txt);
		$('#locationType').width(newWidth);

		txt = $('select#timeType').find('option:selected').text();
		newWidth = ruler(txt);
		$('#timeType').width(newWidth);		

		//check to see that user's data loaded into drop downs
		if(loc != 'nabe'){
			if(place != 'here'){				
				app.events.publish('nav:ready', 'Navigation is fully loaded.');
				app.events.publish('feed:refresh', 'Ready to load articles.');
			}
		}else{
			setTimeout(readyCheck, 1000);	
		};	
	};
		
	//category name
	var category = function(){
		return $('select#newsType').find('option:selected').attr('id');	
	};
	
	//location definition
	var location = function(){
		return $('select#locationType').find('option:selected').attr('id');	
	};
	var location_call = function(){
		
		var call = '';
		
			switch( location() ) {
			
				case 'here':
					if(category() == "All"){
						call = '"geoName" : "'+ app.user.name+ '"';
					}else{
						call = '';
					};
				break;
			
				case 'nabe':
					if(category() == "All"){
						call =  '"geoNabe" : "'+ app.user.nabe+ '" ';
					}else{
						call = '';
					};
				break;
				
				case 'boro':
					if(category() == "All"){
						call =  '"geoBoro" : "'+ app.user.boro+ '"';
					}else{
						call = ''
					};
				break;
				
				case 'city':
					if(category() == "All"){
						call =  '"city" : "NYC"';
					}else{
						call = ''
					};
				break;
			};
		

		return call;
		
		
	};
	
	//time definitions
	var time = function(){
		var x = $('select#timeType').find('option:selected').attr('id');
		var x = parseFloat(x);
		return x
	};
	var time_today = function(){
		var now = new Date;
		now = now.toISOString();
		return now;
	};
	var time_start = function(){
		var date_now = new Date;
		var date_past = date_now - 1000 * 60 * 60 * 24 * time();
		date_past = new Date(date_past).toISOString();
		
		return date_past;
		
	};
	var time_call = function(){
				
		var call = '"date_start" : "' + time_start() + '", "today" : "' + time_today() + '"';
		return call;
		
	};
	
	//--get article list from either user db or article db
	var getArticleList = function(){

		var call = '';
		
		app.events.publish('load:start', 'Getting articles.');
		
		if(category() == 'All'){
			if(location_call()){
				call = '{' + time_call() + ', ' + location_call() + '}';
			}else{
				call = '{' + time_call() + '}';
			};
			var callback = function(data){	getArticleURLs(data);	};
			app.database.init('user', call, callback);
		}else{
			call = '{' + time_call() + ', "cat" : "' + category() + '"}';
			var callback = function(data){
				app.nav.feed = '';
				app.nav.feed = JSON.parse(data);
				app.events.publish('nav:content:done', 'The ' + category() + ' Article array is ready.');
			};
			app.database.init('find', call, callback);
		};

	};
	
	//--get urls from user return
	var articleURLs = [];
	var getArticleURLs = function(data){
		data = JSON.parse(data);
		
		var num_results = data.length;
		var num_parsed = 0;
		
		data.forEach(function(el, arr, index){		
			var url = el.articleClick.url;	
			if(url.length > 0){	
				articleURLs.push(url);
			};
			num_parsed ++ ;		
			if(num_parsed == num_results){
				sort(articleURLs);
				
			};

		});		

	};
	
	//--sort articles
	var sort = function(array){
		
		//sort list of heds by frequency
		var sorted_results_map = {};

		var i;
		var num = array.length	
		for(i=0; i<num; i++){
			var key = array[i];
			sorted_results_map[key] = (sorted_results_map[key] || 0) + 1;
		};
				
		//push sorted list of heds to new array
		var sorted_results = [];
		for(key in sorted_results_map) sorted_results.push({
			key: key, 
			freq: sorted_results_map[key],
		});
		
		sorted_results.sort(function(a,b){return b.freq - a.freq});
		
		//clear articleURL + push sorted list
		articleURLs = [];	
		sorted_results.forEach(function(elem){
			articleURLs.push(elem.key)		
		});
		
		app.events.publish('nav:urls:ready', 'All article URLS pulled from user return.');
		
	};
	
	//--get story content from articleURLs
	var getArticleContent = function(link){
		

		var urlList = [];
		var num_results = articleURLs.length;
		var num_pushed = 0;
		var callback = function(data){
			app.nav.feed = '';
			app.nav.feed = JSON.parse(data);
			app.events.publish('nav:content:done', 'The Most Read Article array is ready.')
		};

		articleURLs.forEach(function(el, arr, index){
			
			if(el.length > 2){
				el = el.replace(/\//g, '^').replace(/\?/g, '`');
				var url = {"storyURL" : el};	
				urlList.push(url);
			};
			
			num_pushed ++ ;		
			if(num_pushed == num_results){
				var query = {"list" : urlList};
				query = JSON.stringify(query);
				app.database.init('list', query, callback);
			};
			
		});

		
	};
	
	//--listeners
	var listeners = function(){

		//--nav:general listeners	
		app.events.subscribe('location:selected', build);
		app.events.subscribe('nav: ready', function(){
			
			//-- set up nav:newstype listeners
			//if news type changes, call db
			$('select#newsType').change(function(){ 

				//if user selects 'most recent'
				if( category() == 'All'){
					app.events.publish('nav:most_read', 'nav is set to most read');
				}else{
					app.events.publish('nav:category', 'nav is set to a category');
				};
				
				var txt = $('select#newsType').find('option:selected').text();
				var newWidth = ruler(txt);
				$('#newsType').width(newWidth);
				
				app.events.publish('feed:refresh', 'The category was changed.');
	
			});
					
			app.events.subscribe('nav:most_read', function(){ 
				$('#locationType').css('display', 'inline');
				$('#inLabel').css('display', 'inline');
			});
			app.events.subscribe('nav:category', function(){ 
				$('#locationType').css('display', 'none');
				$('#inLabel').css('display', 'none');
			});
			
			//if location changes, call db
			$('select#locationType').change(function(){ 

				var txt = $('select#locationType').find('option:selected').text();
				var newWidth = ruler(txt);
				$('#locationType').width(newWidth);
				
				app.events.publish('feed:refresh', 'The location was changed.');
			});
			
			//if timerange changes, call db
			$('select#timeType').change(function(){ 
			
				var txt = $('select#timeType').find('option:selected').text();
				var newWidth = ruler(txt);
				$('#timeType').width(newWidth);
				
				app.events.publish('feed:refresh', 'The time range was changed.');
			});
	
			
		});
		
		//--nav articleURL listeners
		app.events.subscribe('nav:urls:ready', getArticleContent);
		
		//refresh feed
		app.events.subscribe('feed:refresh', getArticleList);
			
		
	};
		
	//--init
	var init = function(){
		listeners();
	};
	
	var ruler = function(txt){
		
		var px = $('#ruler').text(txt).width() + 2;
		return px
		
	};
	
	
	return {
		
		init : init,
		feed : feed		
	}
		
})();

//--newsfeed + article manager
app.content = (function(){
	
	//--FEED
	//build feed
	var build = function(){
		feed_clear();	
		feed_render();
	};
	
	//empty feed
	var feed_clear = function(){
		$('#articleList').empty();
	};
	
	//render feed list
	var feed_render = function(){

		var	template,
			feedSrc,
			renderFeed;
			feedSrc = app.nav.feed;
		
		//--load first article when loaded
		app.events.subscribe('feed:loaded', function(){
			var top_story = $('#articleList li');
			top_story = top_story[0];
			$(top_story).trigger('click');
			
		});
		
		if(feedSrc.length > 0){
			template = $('.newsfeed-template').text();
			renderFeed = _.template(template);		
			$(renderFeed({articles : feedSrc })).appendTo('#articleList');	
			app.events.publish('feed:loaded', 'The newsfeed is done loading.');
			app.events.publish('load:stop', '');
		}else{
			if($('select#newsType').find('option:selected').val() == 'The Most Read'){
				body = {"body" : "Well this is embarassing. It seems no one has checked in from " +  $('select#locationType').find('option:selected').val() + " in the last " + $('select#timeType').find('option:selected').val().toLowerCase() + ". Try a broader search or browse by topic."}
			}else{
				body = {"body" : "Looks like there's no news from the last " +  $('select#timeType').find('option:selected').val().toLowerCase() + " about " +$('select#newsType').find('option:selected').val() + "."};
			}
			template = $('.noresults-template').text();
			renderFeed = _.template(template);		
			$(renderFeed({msg : body })).appendTo('#articleList');	
			app.events.publish('feed:loaded', 'The newsfeed is done loading.');
			app.events.publish('load:stop', '');	
		}
		
	};

	//feed listeners
	var feed_listenON = false;
	var feed_listen = function(){

		//--article click listener
		$('#articleList li').click(function(e){
			e.preventDefault();
			var url = e.currentTarget.childNodes[1].children[0].href;
			reader_clear();
			reader_render(url);
		});	
	
		
		if(feed_listenON == false){
			feed_listenON = true;
						
			//--toggle sidebar visisiblity listeners
			$('#sidebar-hide').click(function(e){
			  	$('.readersidebar').toggleClass('readersidebar-hide');
			  	$('#sidebar-show').toggle();
			  	$('#sidebar-hide').toggle();
			  	$('.reader').toggleClass('reader-wide');
			  	if($('.searchWrapper-active')){$('.searchWrapper-active').css('visibility', 'collapse');}
			  	if($('.twitterWrapper-active')){$('.twitterWrapper-active').css('visibility', 'collapse');}
			  	if($('.newsWrapper-active')){$('.newsWrapper-active').css('visibility', 'collapse');}	
			});
			$('#sidebar-show').click(function(e){
			  	$('.readersidebar').toggleClass('readersidebar-hide');
			  	$('#sidebar-show').toggle();
			  	$('#sidebar-hide').toggle();
			  	$('.reader').toggleClass('reader-wide');
			  	if($('.searchWrapper-active')){$('.searchWrapper-active').css('visibility', 'visible');}
			  	if($('.twitterWrapper-active')){$('.twitterWrapper-active').css('visibility', 'visible');}
			  	if($('.newsWrapper-active')){$('.newsWrapper-active').css('visibility', 'visible');}
			});
			
			//--show search listener
			var showsearch = function(){
				$('#showsearch').on('click', function(e){
					$('#shownews-active').attr('id', 'shownews');
					$('#showtwitter-active').attr('id', 'showtwitter');
					$(this).attr('id', 'showsearch-active');
					$('.newsWrapper-active').attr('class', 'newsWrapper');
					$('.twitterWrapper-active').attr('class', 'twitterWrapper');
					var display = document.getElementById("sidebar-show").style.display;
					if(display == 'block'){$('#sidebar-show').trigger('click');}
					$('.searchWrapper').attr('class', 'searchWrapper-active').css('visibility', 'visible');	

					
					shownews();
					showtwitter();			
				});					
			};
			
			//--show twitter listener
			var showtwitter = function(){
				$('#showtwitter').on('click', function(e){
					$('#shownews-active').attr('id', 'shownews');
					$(this).attr('id', 'showtwitter-active');
					$('#showsearch-active').attr('id', 'showsearch');
					$('.newsWrapper-active').attr('class', 'newsWrapper');
					//$('.twitterWrapper').attr('class', 'twitterWrapper-active');
					$('.searchWrapper-active').attr('class', 'searchWrapper');
					var display = document.getElementById("sidebar-show").style.display;
					if(display == 'block'){$('#sidebar-show').trigger('click');}
					$('.twitterWrapper').attr('class', 'twitterWrapper-active').css('visibility', 'visible');	

					shownews();
					showsearch();
				});
			};
			
			//--show news listener
			var shownews = function(){			
				$('#shownews').on('click', function(e){
					$(this).attr('id', 'shownews-active');
					$('#showtwitter-active').attr('id', 'showtwitter');
					$('#showsearch-active').attr('id', 'showsearch');
					//$('.newsWrapper').attr('class', 'newsWrapper-active');
					$('.twitterWrapper-active').attr('class', 'twitterWrapper');
					$('.searchWrapper-active').attr('class', 'searchWrapper');
					var display = document.getElementById("sidebar-show").style.display;
					if(display == 'block'){$('#sidebar-show').trigger('click');}
					$('.newsWrapper').attr('class', 'newsWrapper-active').css('visibility', 'visible');	
					showsearch();
					showtwitter();
					
				});		
			};
			
			//call twitter + search listeners
			showtwitter();
			showsearch();
		};
	};
	
	//--READER
	//toggle reader visibility
	var reader_close = function(){
		$('.reader').css('display', 'none');	
	};
	var reader_open = function(){
		$('.reader').css('display', 'block');			
	};

	//clear current story
	var reader_clear = function(){	
		app.events.publish('story:track', 'Track prev article.');
		$('.reader').empty();
	};
	
	//reset position to top
	var back_to_top = function(){
   		var pos = $('#top').position();
	    $('.reader').animate({ scrollTop: pos.top });
	};

	//render current story
	var reader_render = function(url){
		var template,
			feedSrc,
			renderFeed,
			thisArticle;
		
		feedSrc = app.nav.feed;
		
		thisArticle = _.findWhere(feedSrc, {storyURL : url});
		if(thisArticle.img){
			if(thisArticle.img.length > 2){
				thisArticle.img = thisArticle.img.replace(/(\W|^)w=130(\W|$)/, 'w=1000');
			}
		}else{
			thisArticle.img = null;
		};
		
		//track article
		var url = thisArticle.storyURL.replace(/\//g, '^').replace(/\?/g, '`');
		app.track.obj.articleClick = {'name': thisArticle.hed, 'url': url, 'keys': thisArticle.keywords, 'tweet': false, 'instapaper': false, 'email': false, 'copy': false, 'ct': false};	
		app.events.publish('track:updated', 'Obj.articleClick updated');
		
		if(typeof(thisArticle.body) == 'string'){ thisArticle.body = thisArticle.body.split('*#'); };
		if(typeof(thisArticle.date) == 'string'){thisArticle.date = thisArticle.date.split('T')[0]; };		
		if(thisArticle.keywords && 	thisArticle.keywords.length < 2){
			if(thisArticle.keywords[0] != undefined){
				thisArticle.keywords = thisArticle.keywords[0].split(',');
			
				if(thisArticle.keywords[0].length < 2) {
					thisArticle.keywords = [];
				};
				
			};
		};
						
		template = $('.reader-template').text();
		renderFeed = _.template(template);	
		
		$(renderFeed({thisArticle : thisArticle })).appendTo('.reader');
		app.events.publish('reader:loaded', 'Current article is loaded in the reader.');
		app.events.publish('reader:show', '');
		
	};
	
	//reader keyword click
	var reader_keyword = function(e){
		var key = e.currentTarget.innerText;
		$('#searchval').val(key);
		app.search.call(key);
		$('#showsearch').trigger('click');
		app.track.obj.search.terms.push(key);
	};
	
	//reader listeners
	var reader_listen = function(){

		$( '.tags h2').click(function(e){
			app.track.obj.articleClick.ct = true;	
			app.events.publish('track:updated', 'Obj.articleClick updated');
			//console.log(e.currentTarget.href);
		});
		
		$('.readerkeys p').click(function(e){
			e.preventDefault();
			app.events.publish('load:start', '');
			reader_keyword(e);
		});	
		
		$('.readerclose').click(function(){
			app.events.publish('reader:hide', 'Clicked reader close.');
		});
		
		$('#twitter').click(function(){
			app.track.obj.articleClick.tweet = true;	
			app.events.publish('track:updated', 'Obj.articleClick updated');
			app.events.publish('social:twitter', 'Clicked Twitter Share.');					
		});
		
		$('#instapaper').click(function(){
			app.track.obj.articleClick.instapaper = true;	
			app.events.publish('track:updated', 'Obj.articleClick updated');
			app.events.publish('social:instapaper', 'Clicked Instapaper Share.');

		});
		
		$('#mail').click(function(){
			app.track.obj.articleClick.email = true;	
			app.events.publish('track:updated', 'Obj.articleClick updated');
			app.events.publish('social:mail', 'Clicked Mail Share.');
		});
		
		$('#copy').click(function(){
			app.track.obj.articleClick.copy = true;	
			app.events.publish('track:updated', 'Obj.articleClick updated');
			app.events.publish('social:copy', 'Clicked Copy URL.');
	
		});

		
	};
	
	//--GENERAL
	//subscriptions
	var subscriptions = function(){
		app.events.subscribe('nav:content:done', build);
		app.events.subscribe('feed:loaded', feed_listen);
		app.events.subscribe('reader:loaded', reader_listen);
		app.events.subscribe('reader:loaded', back_to_top);
		app.events.subscribe('reader:hide', reader_close);
		app.events.subscribe('reader:show', reader_open);

	};

	var init = function(){
		subscriptions();	
	};
	
	return {
		
		init : init,
		clear : reader_clear
	}
		
	
})();

//--image zoom manager
app.imgzoom = (function(){
	
	var init = function(){

		app.events.subscribe('reader:loaded', zoomin);	
		
	};
	
	//zoom in listener + func
	var zoomin = function(){
		$('.img_thumb').one('click', function(){
			var orig_width = $('.img_thumb img').width();
	 		//update image class + store image width + height 		
			$('.img_thumb').attr('class', 'img_large');
			var imgW = $('.img_large img').width();
			var imgH = $('.img_large img').height();
			var rdrW = $('.reader').width();
		
			//update image width to be 40px less than reader frame width
			var new_imgW = rdrW - 40;
			var new_imgH = (new_imgW * imgH) / imgW;
			$('.img_large img').width(new_imgW);
			$('.img_large img').height(new_imgH);
			
			//init zoomout listener
			zoomout(orig_width);
		});
	};
	
	//zoom out listener + func
	var zoomout = function(width){	
		$('.img_large').one('click', function(){
			//update image class, return to orig width
			$('.img_large').attr('class', 'img_thumb');
			$('.img_thumb img').width(width);
			$('.img_thumb img').height(100);
			zoomin();			
		});	
	};
	
	return {
		init : init,
	};

})();

//--twitterfeed manager
app.twitterfeed = (function(){

	var init = function(){
		empty();
		app.events.subscribe('reader:loaded', call);	
	};
	
	var empty = function(){

		$('.tweet').remove();
		$('.tweet_error').remove();		
	
	};
	
	var call = function(){
		
		var url = $('.tags h2 a')[0].href;
//		var url = 'http://www.reuters.com/article/2014/04/21/us-usa-fed-unemployment-idUSBREA3K0V020140421';
		url = 'lib/soc/twitter_roll.php?q=' + url;
		
		$.ajax({
				url: url
			}).success(function(data) {
				parse(data);			
			}).error(function(data){				
				console.log(data);
			});

			
	};
	
	//parse tweet
	var parse = function(d){
		var arr = JSON.parse(d),
			num = arr.length,
			count = 0,
			tweetObj = [],
			i;

		if(num > 0){
			for(i = 0; i<num; i++){
				if(arr[i]){
					var name = arr[i].user.screen_name;
					if(name.length > 1){
						var namelink = 'https://twitter.com/'+name;
						var tweet = arr[i].text;
						var tweetlink = 'https://twitter.com/'+name+'/status/'+arr[i].id_str;
						var thisTweet = {'name' : name, 'namelink' : namelink, 'tweet' : tweet, 'tweetlink' : tweetlink};
						tweetObj.push(thisTweet);
						count++;
						if(count == num){
							build(tweetObj);
						};
					};
				};
			};
		}else{
			tweetObj = [];
			build(tweetObj);
		};

	};
	
	//build twitterfeed
	var build = function(tweetSrc){
		$('#tweetList').empty();
		var	template,
			feedSrc,
			renderFeed;
	
		feedSrc = tweetSrc;
		
		if(feedSrc.length > 0){
			template = $('.twitterfeed-template').text();	
			renderFeed = _.template(template);		
			$(renderFeed({tweets : feedSrc })).appendTo('#tweetList');	
			app.events.publish('tweet:loaded', 'The twitterfeed is done loading.');		
		}else{
 			template = $('.notweets-template').text();
 			feedSrc = {"body" : "No one has tweeted this aritcle yet."};
			renderFeed = _.template(template);		
			$(renderFeed({msg : feedSrc })).appendTo('#tweetList');	
			app.events.publish('tweet:loaded', 'The twitterfeed is done loading.');	
		}
	};
	
	return {
		init: init
	};
	
})();

//--search manager
app.search = (function(){
	
	var feed = [];
	
	//--'enter' listeners
	var listen = function(){
		//listen for "enter" on search val + call search
		$("#searchval").keypress(function(e){
			if (e.which == 13){
				var searchval = $('#searchval').val();
				call(searchval);
				app.events.publish('load:start', searchval);
				app.track.obj.search = { 'terms': searchval};
				app.events.publish('track:updated', 'Obj.search updated. Term is ' + searchval);

			}
		});

		//listen for search done + call parse
		app.events.subscribe('search:content:done', parse);
		
	};
	
	var cleanterm = function(term){
		
		var newTerm = term.replace(/[?!.]/, '').replace(/&/g, 'and');
	
		return newTerm;
	};
	
	//--call database
	var call = function(term){
	
		var query = cleanterm(term);
		query = '{"search":"' + query + '"}'
		
		var callback = function(data){
			app.search.feed = '';
			app.search.feed = JSON.parse(data);		
			app.events.publish('search:content:done', 'Search array is ready.');
		};
		app.database.init('find', query, callback);
	};
	
	//--call from keyword
	var callFromKeyword = function(term){

		var query = cleanterm(term);
		query = '{"search":"' + query + '"}'
		
		app.events.subscribe('search:content:done', parse);
		
		var callback = function(data){
			app.search.feed = '';
			app.search.feed = JSON.parse(data);		
			app.events.publish('search:content:done', 'The results array for the search about ' + $('#searchval').val() + ' is ready.');
		};
		
		app.database.init('find', query, callback);
			
	};
	
	//--parse results
	var parse = function(){
		var	template,
		feedSrc,
		renderFeed;
		$('#searchList').empty();
		
		if(app.search.feed.length > 0){
			template = $('.newsfeed-template').text();
			feedSrc = app.search.feed;
			renderFeed = _.template(template);		
			$(renderFeed({articles : feedSrc })).appendTo('#searchList');	
			app.events.publish('feed:loaded', 'The search results are done loading.');
			app.events.publish('load:stop', '');
			
			//--search click listener
			$('#searchList li').click(function(e){
				e.preventDefault();
				var url = e.currentTarget.childNodes[1].children[0].href;
				app.events.publish('search:articleclick', url);
				
			});
			
		}else{
			template = $('.noresults-template').text();
			var msg = "Sorry. Your search for " + $('#searchval').val() + " came up empty."
			feedSrc = {"body":msg};
			renderFeed = _.template(template);		
			$(renderFeed({msg : feedSrc })).appendTo('#searchList');	
			app.events.publish('feed:loaded', 'The search results are done loading.');
			app.events.publish('load:stop', '');
		}
	};
	
	//--load article
	var loadArticle = function(url){
				
		app.content.clear();
		
		var template,
			feedSrc,
			renderFeed,
			thisArticle;
		
		feedSrc = app.search.feed;
		
		thisArticle = _.findWhere(feedSrc, {storyURL : url});
		thisArticle.img = thisArticle.img.replace(/(\W|^)w=130(\W|$)/, 'w=1000');
		if(thisArticle.img.length < 2){thisArticle.img = null;};
		console.log(thisArticle.img);

		//track article
		app.track.obj.articleClick = {'name': thisArticle.hed, 'url': thisArticle.storyURL, 'keys': thisArticle.keywords, 'tweet': false, 'instapaper': false, 'email': false, 'copy': false, 'ct': false};	
		app.events.publish('track:updated', 'Obj.articleClick updated');
		
		if(typeof(thisArticle.body) == 'string'){ thisArticle.body = thisArticle.body.split('*#'); };
		if(typeof(thisArticle.date) == 'string'){thisArticle.date = thisArticle.date.split('T')[0]; };
		if(thisArticle.keywords.length < 2){thisArticle.keywords = thisArticle.keywords[0].split(','); };
						
		template = $('.reader-template').text();
		renderFeed = _.template(template);	
		
		$(renderFeed({thisArticle : thisArticle })).appendTo('.reader');
		app.events.publish('reader:loaded', 'Current article is loaded in the reader.');
		app.events.publish('reader:show', '');	
	};
	
	//--init listeners
	var init = function(){
		
		$('#searchbar').click(function(){
			listen();
			$('#searchval').val('');
		});
		
		app.events.subscribe('search:articleclick', function(url){
			loadArticle(url);
		});

		
	};
	
	return {
		init : init,
		call : callFromKeyword
	}
	
})();

//--social managers
app.social = (function(){
	
	var init = function(){
		listeners();
	};
	
	var listeners = function(){	
			app.social.twitter.init();
			app.social.copy.init();	
			app.social.mail.init();
			app.events.subscribe('social:instapaper', app.social.ip.init);
	};
	
	return {
		init: init
	}
})();
app.social.twitter = (function(){
	
	var init = function(){
		
		app.events.subscribe('social:twitter', loadTweet);
		
	};
	
	var loadTweet = function(){
		var url,
			hed,
			link;
		
		url = $('.tags h2').html();
		url = $(url).attr('href');
		hed = $('.readerhead h1').text();
		link = 'lib/soc/oauth/tweetPopup.php?l=' + url + "&t=" + hed;
		console.log('///', link);
		window.open(link,"_blank","toolbar=no, scrollbars=no, resizable=no, top=300, left=500, width=400, height=150");			
	};
	
	var init_popup = function(){	
		listeners();
		charCount();
	};	
	
	var listeners = function (){

		$('.postTweet button').click(function(){
			console.log('click');
			post();
		});
		
		$('#writeTweet').keyup(function () {
			charCount();
		});
	};
	
	var charCount = function(){
		
			var max = 137;
			var len = $('#writeTweet').val().length;
			
			if (len >= max) {
				var over = max - len;
				$('#charCount').text("too long");
			} else{
				var char = max - len;
				$('#charCount').text(char);
			}
			
	};
	
	var post = function(){
	
		var tweet =	$('#writeTweet').val();	
		var link = "http://54.198.54.234/lib/soc/oauth/redirect.php?tweet=" + tweet;
		window.open(link,"_self")
		
	};	
	
	return {
		init : init,
		init_popup : init_popup,
		post : post
	};
	
	
})();
app.social.copy = (function(){
	
	var init = function(){
		var url = $('.tags h2').html();
		url = $(url).attr('href');
		
		ZeroClipboard.config( { moviePath: 'bower_components/zeroclipboard/ZeroClipboard.swf' } );
		
		var client = new ZeroClipboard($("#copy"));
		
		client.on( 'dataRequested', function (client, args) {
			$('#copy').fadeTo('slow', 0.5).fadeTo('slow', 1.0).fadeTo('slow', 0.5).fadeTo('slow', 1.0);
			app.events.publish('social:copy:success', 'Link successfully copied.');
			client.setText( url );
		});
			
	};


	return {
		init : init
	}
	
})();
app.social.mail = (function(){
	
	var init = function(){
		app.events.subscribe('social:mail', send);
	};
	
	var send = function(){

		var pub,
			url,
			title,
			subj,
			body,
			link;
			
		title = $('.readerhead h1').text();
		url = $('.tags h2').html();
		url = $(url).attr('href');
		pub = 'Reuters';
		subj = "Spotted On [Bodeg.ga]: " + title;
		body = "I thought you'd be interested in this article from " + pub + ": " + url;

	    link = 'mailto:?subject='
                             + encodeURIComponent(subj)
                             + "&body=" 
                             + encodeURIComponent(body);
             
	    window.location.href = link;
	};
	
	return {
		init : init
	};
	
	
})();
app.social.ip = (function(){
	
	var ip_u,
		ip_p,
		ip_h,	
		ip_url,
		ip_t;
		
	var listeners = function(){

		$('#ip_login_close').click(function(){
			$('.ip_login').fadeOut();
			app.events.publish('blur:hide', 'Instapaper Log-In Close');	
		});

		$('#ip_login_submit').click(function(e){
			e.preventDefault();
			ip_getnewlogin();
		});
		
	};	
	
	//--see if user has hashed password in local storage
	var ip_loggedincheck = function(){

		ip_url = $('.tags h2').html();
		ip_url = $(ip_url).attr('href');
		ip_t = $('.readerhead h1').text();
			
		var login = localStorage.getItem('bdgaiplog');
		
		if(login){
		
			var x = JSON.parse(login);		
			ip_u = x.u;
			ip_h = x.p;	
			ip_decode();		
			
		}else{	
			app.events.publish('blur:show', 'Instapaper Log-In');
			$('.ip_login').fadeIn();
		}
		
	};
	
	//--decode hashed password
	var ip_decode = function(){

		var url = 'http://peaceful-spire-5824.herokuapp.com/gethash/{"hash" : "' + ip_h + '"}'; 
				
		$.ajax({
			url: url
		}).success(function(data) {
			ip_p = data;
			ip_posturl();
		}).error(function(data){				
			console.log('error: ', data);
		});
	};
	
	//--show ip login form
	var ip_newLogIn = function(){

		app.events.publish('blur:show', 'Instapaper Log-In');
		$('.ip_login').fadeIn();
		localStorage.setItem("bdgaiplog", "");
		
	};
	
	//--pull log in from form
	var ip_getnewlogin = function(){

		ip_u = $('#ip_login_name').val();
		ip_p = $('#ip_login_pass').val();
		ip_loginsubmit();
		
	};
		
	//--verify login info
	var ip_loginsubmit = function(){

		var url = 'lib/soc/ip_logincheck.php?u=' + ip_u + '&p=' + ip_p;
		
		$.ajax({
			url: url
		}).success(function(data) {		
			ip_encp();
			ip_posturl();
			app.events.publish('social:instapaper:loginok', 'Instapaper Credentials Accepted');
			$('.ip_login').fadeOut();
			app.events.publish('blur:hide', 'Instapaper Log-In');
		}).error(function(data){				
			//ERROR MESSAGE
			usrmsg(data);
		});

	};
	
	//--password encryption + storage
	var ip_encp = function(p){

		var url = 'lib/soc/ip_hash.php?p=' + p;
		
		$.ajax({
				url: url
			}).success(function(data) {
				ip_h = encodeURIComponent(data);
				ip_savelogin_local();
				ip_savelogin_db();
				//POST TO DB
			}).error(function(data){				
				//ERROR MESSAGE
				//console.log('error: ', data);
			});
		
	};
	var ip_savelogin_local = function(){

		//var x = {u:ip_u, p: ip_h};
		//x = JSON.stringify(x);
		//localStorage.setItem("bdgaiplog", x) ;	
	};
	var ip_savelogin_db = function(){

/*		var url = 'http://peaceful-spire-5824.herokuapp.com/hash/{"original" : "' + ip_p + '", "hash" : "' + ip_h + '"}'; 
		console.log(url);
		
		$.ajax({
			url: url
		}).success(function(data) {
			//console.log('succes: ', data);
		}).error(function(data){				
			//console.log('error: ', data);
		});
*/
	};
	
	//--post url
	var ip_posturl = function(){

		var url = 'lib/soc/ip_addurl.php?u=' + ip_u + '&p=' + ip_p + '&url=' + ip_url + '&t=' + ip_t;
				
		$.ajax({
				url: url
			}).success(function(data){
				app.events.publish('social:instapaper:success', 'Instapaper Posted Successfully');
				$('#instapaper').fadeTo('slow', 0.5).fadeTo('slow', 1.0).fadeTo('slow', 0.5).fadeTo('slow', 1.0);
				ip_p = '';
			}).error(function(data){				
				usrmsg(data);
			});
			
	};

	//--user response
	var usrmsg = function(msg_string){

		//console.log('alert: ', msg_string);
		var msg = parseFloat(msg_string);
		//console.log(typeof(msg));
		switch(msg){
			
		case 200:
			//alert('Thanks! You\'ve been logged in successfully.')
			break;
		case 201:
			alert('You\'re article has been successfully posted.')
			break;
		case 403:
			alert('Woops! It looks like Instapaper doesn\'t recognize that username or password. Please try again.')
			ip_newLogIn();
			break;
		default:
			alert('Looks like something went wrong. Try logging in again.')
			ip_newLogIn();
			break;		
		};
		
	};
	
	var init = function(){
		listeners();
		ip_loggedincheck();
		
	};
	
	return{
		init: init,
		check : ip_loggedincheck
	}	
	
})();

//--blur manager
app.blur = (function(){
	
	var blur = function(){
	
		return document.getElementById('blur');
		
	};
	
	var blur_hide = function(){

		return document.getElementById('blur-hide');
		
		
	};
	
	var show = function(){
		var d = blur_hide();
		if(d){
			document.getElementById('blur-hide').setAttribute('id', 'blur');
		}
	
	
	};
	
	var hide = function(){
		var d = blur();
		if(d){
			document.getElementById('blur').setAttribute('id', 'blur-hide');
		}
		
	};
	
	var init = function(){
		
		app.events.subscribe('location:selected', hide);
		app.events.subscribe('blur:show', show);
		app.events.subscribe('blur:hide', hide);
	};
	
	return {
		init : init,
	};
})();

//--loading indicator
app.loading = (function(){

	var show = function(){
		$('#loading_feed').fadeIn('fast');
	};
	
	var hide = function(){
		$('#loading_feed').fadeOut('fast');
	};
	
	var init = function(){
		app.events.subscribe('load:start', show);	
		app.events.subscribe('load:stop', hide);
		
	};
	
	return{
	
		init : init
	}
	
})();

//--toastr alerts
app.alerts = (function(){
	
		app.events.subscribe('social:instapaper:loginok', function(){
			toastr.success('You\'ve succesfully been logged into Instapaper.')
		});
		
		app.events.subscribe('social:instapaper:success', function(){
			toastr.success('Story successfully saved to Instapaper.')
		});
		
		app.events.subscribe('social:copy:success', function(){
			toastr.success('Link copied.')
		});
		
	
})();

//--show timer
app.showTimer = (function(){

	var intTime = 3*60; //interval is 3 minutes
	counter = 0;

	
	//second counter
	window.setInterval(function(){
		counter++;
		if(counter == intTime){
			console.log('no one\s been here for a while. time to reload');
			document.location.reload(true);
		}

	}, 1*1000);

	$('body').mousemove(function(event){
		counter = 0;
	});
	
})();

//--init
app.init = (function(){

	var home = function(){
		app.user.init();
		app.nav.init();
		app.search.init();
		app.content.init();
		app.imgzoom.init();
		app.twitterfeed.init();
		app.social.init();
		app.loading.init();
		app.blur.init();
	};
	
	return {
		home : home
	};
	
})();

	
//fix for old school computer		
app.events.subscribe('feed:loaded', function(){
	$('.newsfeed').show();
});	

