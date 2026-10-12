Rails.application.routes.draw do
  # Müşteri tarafı (giriş gerektirmez)
  root "requests#new"
  resources :requests, only: %i[ new create ]
  get  "t/:token"         => "requests#show",  as: :customer_ticket
  post "t/:token/replies" => "requests#reply", as: :customer_ticket_replies

  # Ajan tarafı
  resource :session, only: %i[ new create destroy ]

  namespace :agent do
    root "tickets#index"
    resources :tickets, only: %i[ index show ] do
      member do
        post  :take
        patch :assign
        patch :status
        patch :priority
      end
      resources :comments, only: :create
    end
    resource :shift, only: %i[ create destroy ]
    get  "team"   => "team#index",   as: :team
    get  "passes" => "passes#index", as: :passes
    post "demo/reset" => "demo#reset", as: :demo_reset
  end

  get "up" => "rails/health#show", as: :rails_health_check
end
