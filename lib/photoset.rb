class Photoset
  
  DOMAIN = 'rreset.com'
  
  include DataMapper::Resource
  
  property :id,            Serial
  property :user_id,       String, :index => true
  property :photoset_id,   String, :index => true
  property :domain,        String, :index => true
  property :subdomain,     String, :index => true
  property :info,          Json
  property :view_count,    Integer, :default => 0
  property :created_at,    DateTime
  property :deleted,       Boolean,  :default => false
  
  #def info=(info_hash)
  #  self[:info] = info_hash.to_yaml
  #end
  #
  #def info
  #  YAML::load(self[:info])
  #end
  
  def image_url
    "http://farm#{self.farm}.static.flickr.com/#{self.server}/#{self.primary}_#{self.secret}_s.jpg"
  end
  
  def url
    if ENV['RACK_ENV'] == 'development'
      "localhost:9393/photosets/#{self.photoset_id}"
    elsif self.domain
      self.domain
    elsif self.subdomain
      "#{self.subdomain}.#{DOMAIN}"
    else
      "#{self.photoset_id}.#{DOMAIN}"
    end
  end
  
  def shared?
    if self.created_at.nil? || self.deleted?
      false
    else
      true
    end
  end
  
  def method_missing(method, *args)
    info = self.info[method.to_s] || self.info[method]
    if info
      info
    else
      raise NoMethodError
    end
  end
  
end