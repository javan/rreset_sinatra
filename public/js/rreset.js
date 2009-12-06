var rreset = {
  photoset_id: null,
  photoset: null,
  photo: {},
  current_photo_id: null,
  photo_size: 4,
  ordered_photo_ids: [],
  data_loading: false,
  shaking: false,
  window_hash_override: null,
  api_endpoint: 'http://api.flickr.com/services/rest/?',
  api_key: '300af3865b046365f28aebbb392a3065',

  initialize_photoset: function(photoset_id){
    rreset.photoset_id = photoset_id;
    rreset.load_photoset();
    rreset.observe_window_hash_change();
    rreset.initialize_key_controls();
  },
  
  load_photoset: function(){
    rreset.loading();
    $.getJSON([rreset.api_endpoint, 'api_key=', rreset.api_key, '&method=flickr.photosets.getPhotos', '&photoset_id=', rreset.photoset_id, '&format=json&jsoncallback=?'].join(''), function(data){
      if (data.stat != 'ok') {
        return rreset.bad_response();
      }
      rreset.photoset = data.photoset;
      rreset.photoset.photo = rreset.photoset.photo;
      // make an array of the photoset ids and initialize the photo object with the index
      var index = 0;
      $.each(rreset.photoset.photo, function(){
        rreset.photo[this.id] = {};
        rreset.photo[this.id].index = index;
        index++;
        rreset.ordered_photo_ids.push(this.id);
      });

      rreset.load_photo();
    });
  },

  load_photo: function(preload){
    var photo_id = rreset.photo_id_from_window_hash();
    rreset.current_photo_id = photo_id;
    if (!rreset.photo[photo_id].size){
      rreset.loading();
      $.getJSON([rreset.api_endpoint, 'api_key=', rreset.api_key, '&method=flickr.photos.getSizes', '&photo_id=', photo_id, '&format=json&jsoncallback=?'].join(''), function(data){
        if (data.stat != 'ok') {
          return rreset.bad_response();
        }
        rreset.photo[photo_id].size = data.sizes.size;
        rreset.display_photo();
      });
    } else {
      rreset.display_photo();
    }
  },
  
  display_photo: function() {
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
      rreset.done_loading();
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

  next_photo: function() {
    if (!rreset.on_last_photo()) {
      window.location.hash = rreset.ordered_photo_ids[rreset.photo[rreset.current_photo_id].index + 1];
      rreset.load_photo();
    } else {
      rreset.shake_photo();
    }
  },

  prev_photo: function() {
    if (!rreset.on_first_photo()) {
      window.location.hash = rreset.ordered_photo_ids[rreset.photo[rreset.current_photo_id].index - 1];
      rreset.load_photo(); 
    } else {
      rreset.shake_photo();
    }
  },
  
  on_first_photo: function() {
    if (rreset.photo[rreset.current_photo_id].index == 0) {
      return true;
    } else {
      return false;
    }
  },
  
  on_last_photo: function() {
    if (rreset.photo[rreset.current_photo_id].index == rreset.ordered_photo_ids.length - 1) {
      return true;
    } else {
      return false;
    }
  },
  
  bigger_photo: function() {
    if (rreset.photo[rreset.current_photo_id].size[rreset.photo_size + 1]) {
      rreset.photo_size++;
      rreset.display_photo();
    } else {
      rreset.shake_photo();
    }
  },
  
  smaller_photo: function() {
    if (rreset.photo[rreset.current_photo_id].size[rreset.photo_size - 1]) {
      rreset.photo_size--;
      rreset.display_photo();
    } else {
      rreset.shake_photo();
    }
  },
  
  photo_id_from_window_hash: function(){
    if (window.location.hash == '') {
      // If there's no photo_id in the window hash and the photoset is loaded,
      // return the last photo in the set, we're on the "index" page.
      if (rreset.photoset.photo) {
        return rreset.photoset.photo[rreset.photoset.photo.length - 1].id;
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
    $(document).keyup(function(e) {
      var key = e.charCode ? e.charCode : e.keyCode ? e.keyCode : 0;
			switch(key) {
				case 37: // left
				  rreset.prev_photo();
				  break;
				case 38: // up
				  rreset.bigger_photo();
				  break;
				case 39: // right
				  rreset.next_photo();
				  break;
				case 40: // down
				  rreset.smaller_photo();
				  break;
			}
    });
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
  },
  
  done_loading: function() {
    rreset.data_loading = false;
    $('#loading').hide();
  }
  
};