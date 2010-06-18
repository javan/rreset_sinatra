class Photoset
  
  include MongoMapper::Document
  
  key :user_id,       String
  key :photoset_id,   String
  key :domain,        String
  key :subdomain,     String
  key :farm,          String
  key :server,        String
  key :primary,       String
  key :secret,        String
  key :view_count,    Integer, :default => 0
  key :shared,        Boolean,  :default => true
  timestamps!
  
  def image_url
    "http://farm#{self.farm}.static.flickr.com/#{self.server}/#{self.primary}_#{self.secret}_s.jpg"
  end
  
  def url
    "/sets/#{self.photoset_id}"
  end
  
  def shared?
    self.created_at && super
  end
  
end