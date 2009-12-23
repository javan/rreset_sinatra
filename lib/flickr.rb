require 'httparty'
require 'digest/md5'
require 'cgi'

class Flickr
  
  include HTTParty
  base_uri 'http://flickr.com/services/rest/'
  format :xml

  class << self
  
    def login_url
      params = sign_params(default_params.merge(:perms => :read))
      'http://flickr.com/services/auth/?' + params.map { |key, val| "#{key}=#{CGI.escape(val.to_s)}" }.join('&')
    end
    
    def auth_get_token(frob)
      params = sign_params(default_params.merge(:method => 'flickr.auth.getToken', :frob => frob))
      get('', :query => params).symbolize_keys![:rsp][:auth]
    end
  
    def photosets_get_list(user_id)
      params = default_params.merge(:method => 'flickr.photosets.getList', :user_id => user_id)
      get('', :query => params).symbolize_keys![:rsp][:photosets][:photoset].map { |p| p.symbolize_keys! }
    end
    
    def photoset_get_info(photoset_id)
      params = default_params.merge(:method => 'flickr.photosets.getInfo', :photoset_id => photoset_id)
      get('', :query => params).symbolize_keys![:rsp][:photoset]
    end
  
  private
  
    def sign_params(params)
      params.merge!(:api_sig => Digest::MD5.hexdigest(FLICKR_SECRET + params.stringify_keys.sort.flatten.join))
    end
    
    def default_params
      { :api_key => FLICKR_KEY }
    end
    
  end
  
end