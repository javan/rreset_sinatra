require 'rubygems'
require 'sinatra'
require 'lib/core_extensions'
require 'lib/flickr'
require 'dm-core'
require 'dm-timestamps'

DataMapper.setup(:default, 'mysql://localhost/rreset')

class Photoset
  
  include DataMapper::Resource

  property :id,          Serial
  property :user_id,     String
  property :photoset_id, String
  property :created_at,  DateTime
  
end

DataMapper.auto_upgrade!

enable :sessions
set :sessions, true

helpers do
  def photoset_image_url(photoset)
    "http://farm#{photoset[:farm]}.static.flickr.com/#{photoset[:server]}/#{photoset[:primary]}_#{photoset[:secret]}_s.jpg"
  end
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
  @photosets = Flickr.photosets_get_list(session[:flickr][:user_id])
  
  erb :photosets
end

post '/photosets' do
  @photoset = Photoset.new
  @photoset.attributes = { :user_id => session[:flickr][:user_id], :photoset_id => params[:photoset_id] }
  @photoset.save
  
  headers 'Content-Type' => 'text/javascript; charset=utf-8' 
  %Q(
    $('li#photoset_#{params[:photoset_id]}').css('background-color', 'yellow');
    console.log('#{params[:photoset_id]}');
  )
end