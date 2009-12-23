require 'rubygems'
require 'sinatra'
require 'yaml'
require 'dm-core'
require 'dm-timestamps'
require 'lib/core_extensions'
require 'lib/flickr'
require 'lib/photoset.rb'

enable :sessions

configure do
  FLICKR_KEY = ENV['FLICKR_KEY']
  FLICKR_SECRET  = ENV['FLICKR_SECRET']
  
  DataMapper.setup(:default, ENV['DATABASE_URL'] || 'mysql://localhost/rreset')
end

configure :development do 
  DataMapper.auto_migrate!
end

configure :production do
  DataMapper.auto_upgrade!
end

helpers do
  def signed_in?
    session[:flickr] && session[:flickr][:user_id] && session[:flickr][:token]
  end
end

error do
  "Oops. #{request.env['sinatra.error'].name} - #{request.env['sinatra.error'].message}"
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
  @created_photosets = Photoset.all(:user_id => session[:flickr][:user_id], :deleted => false).index_by(&:photoset_id) rescue {}
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
  
  erb :'owner/photosets'
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
  erb :'owner/photoset', :layout => false
end

delete '/photosets/:photoset_id' do
  @photoset = Photoset.first(:photoset_id => params[:photoset_id], :user_id => session[:flickr][:user_id])
  @photoset.update(:deleted => true)
  
  erb :'owner/photoset', :layout => false
end

get '/photosets/:photoset_id/?' do
  @photoset = Photoset.first(:photoset_id => params[:photoset_id], :deleted => false)
  erb :photoset
end