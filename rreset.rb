require 'rubygems'
require 'sinatra'
require 'yaml'
require 'lib/core_extensions'
require 'lib/flickr'
require 'dm-core'
require 'dm-timestamps'

DataMapper.setup(:default, 'mysql://localhost/rreset')

class Photoset
  
  include DataMapper::Resource

  property :id,            Serial
  property :user_id,       String
  property :photoset_id,   String
  property :info,          Text
  property :created_at,    DateTime
  property :deleted,       Boolean,  :default => false
  
  def info=(info_hash)
    self[:info] = info_hash.to_yaml
  end
  
  def info
    YAML::load(self[:info])
  end
  
  def image_url
    "http://farm#{self.farm}.static.flickr.com/#{self.server}/#{self.primary}_#{self.secret}_s.jpg"
  end
  
  def method_missing(method, *args)
    info = self.info[method]
    if info
      info
    else
      raise NoMethodError
    end
  end
  
end

DataMapper.auto_upgrade!

enable :sessions
set :sessions, true

helpers do
end
  
get '/' do
  erb :index
end

get '/login' do
  @auth = Flickr.auth_get_token(params[:frob])
  session[:flickr] = { :user_id => @auth[:user][:nsid], :token => @auth[:token] }
  
  redirect '/photosets'
end

get '/photosets' do
  @created_photosets = Photoset.all(:user_id => session[:flickr][:user_id]).index_by(&:photoset_id) rescue {}
  @photosets = Flickr.photosets_get_list(session[:flickr][:user_id])
  
  created, not_created = [], []
  @photosets.each do |photoset|
    if @created_photosets[photoset[:id]]
      created << @created_photosets[photoset[:id]]
    else
      not_created << Photoset.new(:photoset_id => photoset.delete(:id), :info => photoset)
    end
  end
  @photosets = created + not_created
  
  erb :photosets
end

post '/photosets' do
  info = Flickr.photoset_get_info(params[:photoset_id])
  @photoset = Photoset.first(:user_id => session[:flickr][:user_id], :photoset_id => params[:photoset_id])
  if @photoset
    @photoset.update(:deleted => false, :info => info)
  else
    @photoset = Photoset.create(:user_id => session[:flickr][:user_id], :photoset_id => params[:photoset_id], :info => info)
  end
  @created_photosets = { @photoset.photoset_id => true }
  erb :photoset, :layout => false
end

delete '/photosets/:photoset_id' do
  Photoset.first(:photoset_id => params[:photoset_id], :user_id => session[:flickr][:user_id]).update(:deleted => true)
  headers 'Content-Type' => 'text/javascript; charset=utf-8'
  ""
end

get '/photosets/:user_id/:photoset_id/?' do
  Photoset.first(:user_id => session[:flickr][:user_id], :photoset_id => params[:photoset_id], :deleted => false)
 
  "<pre>#{@photoset.to_yaml}</pre>"
end