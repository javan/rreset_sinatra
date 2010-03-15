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
  
  #ensure_index :user_id
  
  def self.domain
    'rreset.com'
  end
  
  def image_url
    "http://farm#{self.farm}.static.flickr.com/#{self.server}/#{self.primary}_#{self.secret}_s.jpg"
  end
  
  def url
    if ENV['RACK_ENV'] == 'development'
      "localhost:9393/sets/#{self.photoset_id}"
    elsif self.domain
      self.domain
    elsif self.subdomain
      "#{self.subdomain}.#{DOMAIN}"
    else
      "#{self.photoset_id}.#{DOMAIN}"
    end
  end
  
  def shared?
    self.created_at && super
  end
  
end