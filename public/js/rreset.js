var rreset = {
  photoset_id: null,
  set: null,
  photo: {},
  current_photo_id: null,
  photo_size: 4,
  ordered_photo_ids: [],
  data_loading: false,
  shaking: false,
  window_hash_override: null,
  api_endpoint: 'http://api.flickr.com/services/rest/?',
  api_key: null,
  original_title: null,

  initialize_set: function(photoset_id){
    rreset.set_id = photoset_id;
    rreset.original_title = $('title:first').html();
    rreset.load_set();
    rreset.observe_window_hash_change();
    rreset.initialize_key_controls();
  },
  
  load_set: function(){
    rreset.loading();
    $.getJSON([rreset.api_endpoint, 'api_key=', rreset.api_key, '&method=flickr.photosets.getPhotos', '&photoset_id=', rreset.set_id, '&format=json&jsoncallback=?'].join(''), function(data){
      if (data.stat != 'ok') {
        return rreset.bad_response();
      }
      rreset.set = data.photoset;
      rreset.set.photo = rreset.set.photo;
      // make an array of the photoset ids and initialize the photo object with the index
      var index = 0;
      $.each(rreset.set.photo, function(){
        rreset.photo[this.id] = {};
        rreset.photo[this.id].index = index;
        index++;
        rreset.ordered_photo_ids.push(this.id);
      });

      rreset.load_photo();
    });
  },

  load_photo: function(preload) {
    // preload will be a photo_id if preloading.
    var preload = (preload == undefined ? false : preload);
    
    var photo_id = (preload ? preload : rreset.photo_id_from_window_hash());
    if (!preload) {
      rreset.current_photo_id = photo_id;
    }
    
    if (!rreset.photo[photo_id].size){
      if (!preload) {
        rreset.loading();
      }
      
      $.getJSON([rreset.api_endpoint, 'api_key=', rreset.api_key, '&method=flickr.photos.getSizes', '&photo_id=', photo_id, '&format=json&jsoncallback=?'].join(''), function(data){
        if (data.stat != 'ok') {
          return rreset.bad_response();
        }
        rreset.photo[photo_id].size = data.sizes.size;
        if (!preload) {
          rreset.display_photo();
        }
      });
    } else {
      if (!preload) {
        rreset.display_photo();
      }
    }
  },
  
  display_photo: function() {
    _gaq.push(['_trackEvent', 'Photos', 'View', rreset.photoset_id+' - '+rreset.current_photo_id, rreset.photo_size]);
    
    // local function to call after the image has been preloaded.
    var loaded = function() {
      if (!rreset.photo[rreset.current_photo_id].size) {
        return false;
      }
      
      $('#photo').attr('src', rreset.photo[rreset.current_photo_id].size[rreset.photo_size].img.src);
      // hide next if on last photo
      if (rreset.on_last_photo()) {
        $('#next_photo').hide();
      } else {
        $('#next_photo').show();
      }

      // hide prev photo if on first photo
      if (rreset.on_first_photo()) {
        $('#prev_photo').hide();
      } else {
        $('#prev_photo').show();
      }
      
      // hide smaller button if on smallest
      if (rreset.photo_size == 0) {
        $('#smaller_photo').hide();
      } else {
        $('#smaller_photo').show();
      }
      
      // hide bigger button if on biggest
      if (rreset.photo_size == rreset.photo[rreset.current_photo_id].size.length - 1) {
        $('#bigger_photo').hide();
      } else {
        $('#bigger_photo').show();
      }
      
      rreset.done_loading();
      rreset.load_photo_info();
      rreset.preload_neighbors();
    };
    
    if (rreset.current_photo_id != rreset.photo_id_from_window_hash() || !rreset.photo[rreset.current_photo_id].size) {
      return false;
    }
    
    rreset.loading();
    
    if (rreset.photo[rreset.current_photo_id].size[rreset.photo_size].img) {
      loaded();
    } else {
      rreset.photo[rreset.current_photo_id].size[rreset.photo_size].img = new Image();
      rreset.photo[rreset.current_photo_id].size[rreset.photo_size].img.src = rreset.photo[rreset.current_photo_id].size[rreset.photo_size].source;
      $(rreset.photo[rreset.current_photo_id].size[rreset.photo_size].img).load(function(){
        loaded();
      });
    }
   
  },
  
  load_photo_info: function() {
    var current_photo_id = rreset.current_photo_id;
    if (!rreset.photo[current_photo_id].photo) {
      $.getJSON([rreset.api_endpoint, 'api_key=', rreset.api_key, '&method=flickr.photos.getInfo', '&photo_id=', current_photo_id, '&format=json&jsoncallback=?'].join(''), function(data) {
        if (data.stat == 'ok') {
          rreset.photo[current_photo_id].photo = data.photo;
          rreset.display_photo_info();
        }
      });
    } else {
      rreset.display_photo_info();
    }
  },
  
  display_photo_info: function() {
    if (rreset.current_photo_id != rreset.photo_id_from_window_hash()) {
      return false;
    }
    
    var photo = rreset.photo[rreset.current_photo_id].photo
    var license = rreset.flickr_license(photo.license);
    $('#license_link').attr({ href: license.url, title: license.name });
    $('#flickr_link').attr({ href: 'http://flickr.com/photos/'+rreset.set.owner+'/'+photo.id });
    $('#photo_info .content').show();
    
    if (photo.title._content == '') {
      document.title = rreset.original_title;
    } else {
      document.title = photo.title._content + ' :: ' + rreset.original_title;
    }
  },
  
  preload_neighbors: function() {
    var prev = rreset.prev_photo_id();
    if (prev) {
      rreset.load_photo(prev);
    }
    
    var next = rreset.next_photo_id();
    if (next) {
      rreset.load_photo(next);
    }
  },

  next_photo: function() {
    _gaq.push(['_trackEvent', 'Sets', 'Navigate', 'next']);
    if (rreset.is_loading()) {
      return false;
    }
    if (!rreset.on_last_photo()) {
      window.location.hash = rreset.next_photo_id();
      rreset.load_photo();
      $('#next_photo').addClass('activity');
    } else {
      rreset.shake_photo();
    }
  },
  
  next_photo_id: function() {
    var next = rreset.ordered_photo_ids[rreset.photo[rreset.current_photo_id].index + 1];
    if (next) {
      return next;
    } else {
      return null;
    }
  },
  
  prev_photo_id: function() {
    var prev = rreset.ordered_photo_ids[rreset.photo[rreset.current_photo_id].index - 1];
    if (prev) {
      return prev;
    } else {
      return null;
    }
  },

  prev_photo: function() {
    _gaq.push(['_trackEvent', 'Sets', 'Navigate', 'previous']);
    if (rreset.is_loading()) {
      return false;
    }
    if (!rreset.on_first_photo()) {
      window.location.hash = rreset.prev_photo_id();
      rreset.load_photo();
      $('#prev_photo').addClass('activity');
    } else {
      rreset.shake_photo();
    }
  },
  
  on_first_photo: function() {
    if (!rreset.prev_photo_id()) {
      return true;
    } else {
      return false;
    }
  },
  
  on_last_photo: function() {
    if (!rreset.next_photo_id()) {
      return true;
    } else {
      return false;
    }
  },
  
  bigger_photo: function() {
    _gaq.push(['_trackEvent', 'Sets', 'Navigate', 'bigger', rreset.photo_size + 1]);
    if (rreset.photo[rreset.current_photo_id].size[rreset.photo_size + 1]) {
      rreset.photo_size++;
      $('#bigger_photo').addClass('activity');
      rreset.display_photo();
    } else {
      rreset.shake_photo();
    }
  },
  
  smaller_photo: function() {
    _gaq.push(['_trackEvent', 'Sets', 'Navigate', 'smaller', rreset.photo_size - 1]);
    if (rreset.photo[rreset.current_photo_id].size[rreset.photo_size - 1]) {
      rreset.photo_size--;
      $('#smaller_photo').addClass('activity');
      rreset.display_photo();
    } else {
      rreset.shake_photo();
    }
  },
  
  photo_id_from_window_hash: function(){
    if (window.location.hash == '') {
      // If there's no photo_id in the window hash and the photoset is loaded,
      // return the last photo in the set, we're on the "index" page.
      if (rreset.set.photo) {
        return rreset.set.photo[rreset.set.photo.length - 1].id;
      } else {
        return null;
      }
    } else {
      return window.location.hash.split('#').reverse()[0];
    }
  },
  
  observe_window_hash_change: function() {
    setInterval(function(){
      if (!rreset.data_loading && rreset.current_photo_id != rreset.photo_id_from_window_hash()){
        rreset.load_photo();
      }
    }, 60);
  },
  
  initialize_key_controls: function() {
    $(document).bind('keydown', 'up',    function() { rreset.bigger_photo();  return false; });
    $(document).bind('keydown', 'down',  function() { rreset.smaller_photo(); return false; });
    $(document).bind('keydown', 'left',  function() { rreset.prev_photo();    return false; });
    $(document).bind('keydown', 'right', function() { rreset.next_photo();    return false; });
  },
  
  bad_response: function(){
    rreset.data_loading = false;
    alert('bad response!');
    return false;
  },
  
  shake_photo: function() {
    if (!rreset.shaking) {
      rreset.shaking = true;
      $('#photo').animate({ marginLeft: '-5px' }, 40)
                 .animate({ marginLeft: '5px' }, 80)
                 .animate({ marginLeft: '0' }, 40, function(){
                   rreset.shaking = false;
                 });
    }
    
    rreset.done_loading();
  },
  
  loading: function() {
    rreset.data_loading = true;
    $('#loading').show();
    document.title = 'loading...';
  },
  
  is_loading: function() {
    return rreset.data_loading;
  },
  
  done_loading: function() {
    rreset.data_loading = false;
    $('#loading').hide();
    setTimeout(function(){
      $('.activity').removeClass('activity');
    }, 10);
    
  },
  
  flickr_license: function(license_id) {
    switch(parseInt(license_id)) {
      case 4:
        return { name: "Attribution License", url: "http://creativecommons.org/licenses/by/2.0/" };
        break;
      case 6:
        return { name: "Attribution-NoDerivs License", url: "http://creativecommons.org/licenses/by-nd/2.0/" };
        break;
      case 3:
        return { name: "Attribution-NonCommercial-NoDerivs License", url: "http://creativecommons.org/licenses/by-nc-nd/2.0/" };
        break;
      case 2:
        return { name: "Attribution-NonCommercial License", url: "http://creativecommons.org/licenses/by-nc/2.0/" };
        break;
      case 1:
        return { name: "Attribution-NonCommercial-ShareAlike License", url: "http://creativecommons.org/licenses/by-nc-sa/2.0/" };
        break;
      case 5:
        return { name: "Attribution-ShareAlike License", url: "http://creativecommons.org/licenses/by-sa/2.0/" };
        break;
      case 7:
        return { name: "No known copyright restrictions", url: "http://flickr.com/commons/usage/" };
        break;
    }
  }
  
}