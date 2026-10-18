module Agent
  # Vardiyaya giriş/çıkış. Çıkışta Otomatik Pas hemen çalışır.
  class ShiftsController < BaseController
    # Tarama, vardiya değiştikten SONRA çalışmalı; yoksa vardiyaya giren ajanın
    # talepleri, o daha "vardiya dışı" görünürken başkasına pas edilir.
    skip_before_action :run_sweeper

    def create
      length = User::SHIFT_LENGTHS.fetch(params[:length], User::SHIFT_LENGTHS["8 saat"])
      current_user.start_shift!(length)
      result = Sweeper.run
      received = result.passes.count { |ticket| ticket.assignee_id == current_user.id }
      notice = "Vardiyan başladı (bitiş #{current_user.on_shift_until.strftime('%H:%M')})."
      notice += " Bekleyen #{received} talep sana pas edildi." if received.positive?
      redirect_back_or_to agent_root_path, notice:
    end

    def destroy
      own_ids = current_user.assigned_tickets.active.ids
      current_user.end_shift!
      Sweeper.run
      passed = Ticket.where(id: own_ids).where.not(assignee_id: current_user.id).count
      kept = own_ids.size - passed
      notice = "Vardiyan bitti."
      notice += " #{passed} talebin vardiyadaki ekip arkadaşlarına pas edildi." if passed.positive?
      notice += " Vardiyada kimse olmadığı için #{kept} talep sende kaldı; vardiyaya ilk giren ajana pas edilecek." if kept.positive?
      redirect_to agent_passes_path, notice:
    end
  end
end
