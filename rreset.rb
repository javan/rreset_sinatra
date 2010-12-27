require 'rubygems'
require 'sinatra'
require 'mongo_mapper'
require 'lib/core_extensions'
require 'lib/flickr'
require 'lib/photoset.rb'

enable :sessions

if ENV['HOPTOAD_KEY']
  require 'hoptoad_notifier'
  
  HoptoadNotifier.configure do |config|
    config.api_key = ENV['HOPTOAD_KEY']
  end
  
  use HoptoadNotifier::Rack
  enable :raise_errors
end

if ENV['MONGOHQ_URL']
  MongoMapper.config = { 'heroku' => { 'uri' => ENV['MONGOHQ_URL'] } }
  MongoMapper.connect('heroku')
else
  MongoMapper.database = 'rreset'
end

configure do
  FLICKR_KEY = ENV['FLICKR_KEY'] || '300af3865b046365f28aebbb392a3065'
  FLICKR_SECRET  = ENV['FLICKR_SECRET'] || '38d1e4ab6e9d89e1'
  Photoset.ensure_index(:user_id)
  Photoset.ensure_index(:photoset_id)
end

configure :production do
  require 'newrelic_rpm'
end

helpers do
  def signed_in?
    session[:flickr] && session[:flickr][:user_id] && session[:flickr][:token]
  end
end

get '/' do
  erb :index
end

get '/login' do
  @auth = Flickr.auth_get_token(params[:frob])
  session[:flickr] = { :user_id => @auth[:user][:nsid], :token => @auth[:token] }
  
  redirect '/sets'
end

get '/sets' do
  created_sets = Photoset.all(:user_id => session[:flickr][:user_id], :shared => true).index_by(&:photoset_id) rescue {}
  sets = Flickr.photosets_get_list(session[:flickr][:user_id])
  
  created, not_created = [], []
  sets.each do |set|
    if created_sets[set[:id]]
      created << created_sets[set[:id]]
    else
      not_created << Photoset.new({ :photoset_id => set.delete(:id), :shared => false }.merge(set))
    end
  end
  @sets = created + not_created
  
  erb :'owner/sets'
end

post '/sets' do
  info = Flickr.photoset_get_info(params[:photoset_id]).except(:id)
  @set = Photoset.first(:user_id => session[:flickr][:user_id], :photoset_id => params[:photoset_id])
  if @set
    @set.update_attributes({ :shared => true }.merge(info))
  else
    info.delete(:id)
    @set = Photoset.create(info.merge(:user_id => session[:flickr][:user_id], :photoset_id => params[:photoset_id]))
  end

  erb :'owner/_set', :layout => false
end

delete '/sets/:photoset_id' do
  @set = Photoset.first(:photoset_id => params[:photoset_id], :user_id => session[:flickr][:user_id])
  @set.update_attributes(:shared => false)
  
  erb :'owner/_set', :layout => false
end

get '/sets/all' do
  @sets = Photoset.all(:order => 'created_at desc')
  
  erb :sets
end

get '/sets/:photoset_id/?' do
  @set = Photoset.first(:photoset_id => params[:photoset_id], :shared => true)
  erb :set
end