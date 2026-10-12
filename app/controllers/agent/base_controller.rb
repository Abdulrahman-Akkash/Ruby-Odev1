module Agent
  class BaseController < ApplicationController
    layout "agent"

    # Zaman kuralları her ajan isteğinde işletilir (bkz. app/models/sweeper.rb).
    before_action :run_sweeper

    helper_method :current_user

    private
      def current_user
        Current.user
      end

      def run_sweeper
        Sweeper.run
      end
  end
end
