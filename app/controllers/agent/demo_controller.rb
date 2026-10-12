module Agent
  # Sunum öncesi demo verisini "şimdi"ye göre yeniden kurar.
  # Tüm kullanıcılar ve oturumlar yeniden oluşturulduğu için tekrar giriş gerekir.
  class DemoController < BaseController
    skip_before_action :run_sweeper

    def reset
      Demo.reset!
      cookies.delete(:session_id)
      redirect_to new_session_path, notice: "Demo verisi sıfırlandı. Tekrar giriş yapın."
    end
  end
end
