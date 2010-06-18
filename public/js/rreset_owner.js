rreset.owner = {
  
  initialize_sets: function() {
    $('.set input.toggle').live('change', function(){
      var checkbox = $(this);
      checkbox.parent().find(':input').attr('disabled', true);
      if (checkbox.attr('checked') == true) {
        $.ajax({
          url: '/sets',
          type: 'POST', data: { photoset_id: checkbox.attr('value') },
          success: function(html) {
            $('#set_'+checkbox.attr('value')).replaceWith(html);
          }
        });
      } else {
        $.ajax({ 
          url: '/sets/'+checkbox.attr('value'), 
          type: 'DELETE', 
          success: function(html) {
            $('#set_'+checkbox.attr('value')).replaceWith(html);
          }
        });
      }
    });
  }
  
};