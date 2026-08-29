/* ============================================================
 * Тактильная отдача «Люмоса» (только на нативных платформах).
 * В браузере все вызовы — безопасные no-op: игра работает как раньше.
 *
 * Настроено по смыслу действия:
 *   поглаживание  — мягкая «дрожь» (light impact)
 *   уборка/купание — ощутимый толчок (medium impact)
 *   уровень/квест — «успех» (notification success)
 * ============================================================ */
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const native = () => Capacitor.isNativePlatform();

/** мягкое мурчание — поглаживание питомца */
export async function purr() {
  if (!native()) return;
  try { await Haptics.impact({ style: ImpactStyle.Light }); } catch { /* noop */ }
}

/** ощутимое действие — уборка, купание, кормление */
export async function thud() {
  if (!native()) return;
  try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch { /* noop */ }
}

/** «успех» — новый уровень, выполнен ритуал, подарок принят */
export async function celebrate() {
  if (!native()) return;
  try { await Haptics.notification({ type: NotificationType.Success }); } catch { /* noop */ }
}

/** лёгкий тик — нажатия кнопок и отправка сообщения в чате */
export async function tick() {
  if (!native()) return;
  try { await Haptics.impact({ style: ImpactStyle.Light }); } catch { /* noop */ }
}
