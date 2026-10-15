"use client";

import { useEffect, useState, useTransition } from "react";
import {
  deletePushSubscription,
  savePushSubscription,
  sendTestNotification,
} from "@/app/(app)/settings/notification-actions";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";

type State = "checking" | "unsupported" | "install-first" | "blocked" | "off" | "on";

/** VAPID keys travel as URL-safe base64; the Push API wants bytes. */
function keyBytes(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches;
}

async function currentSubscription() {
  const registration = await navigator.serviceWorker.getRegistration();
  return registration ? registration.pushManager.getSubscription() : null;
}

export function NotificationSettings({ isDemo }: { isDemo: boolean }) {
  const [state, setState] = useState<State>("checking");
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    // iPhone only allows notifications for apps added to the home screen.
    const next: Promise<State> = !supported
      ? Promise.resolve(isIos() && !isInstalled() ? "install-first" : "unsupported")
      : Notification.permission === "denied"
        ? Promise.resolve("blocked")
        : currentSubscription().then((sub) => (sub ? "on" : "off"));
    next.then(setState, () => setState("unsupported"));
  }, []);

  function enable() {
    setError(undefined);
    setNotice(undefined);
    startTransition(async () => {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""),
      });
      const result = await savePushSubscription(subscription.toJSON(), navigator.userAgent);
      if (!result.ok) {
        await subscription.unsubscribe();
        setError(result.error);
        return;
      }
      setState("on");
    });
  }

  function disable() {
    setError(undefined);
    setNotice(undefined);
    startTransition(async () => {
      const subscription = await currentSubscription();
      if (subscription) {
        await deletePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setState("off");
    });
  }

  function test() {
    setError(undefined);
    startTransition(async () => {
      const result = await sendTestNotification();
      if (result.ok) setNotice("Enviamos um aviso de teste. Ele deve aparecer em alguns segundos.");
      else setError(result.error);
    });
  }

  const description: Record<State, string> = {
    checking: "Verificando este aparelho…",
    unsupported: "Este navegador não recebe notificações. No Android, use o Chrome; no iPhone, instale o app.",
    "install-first":
      "No iPhone, primeiro instale o app: toque em Compartilhar e em “Adicionar à Tela de Início”. Depois abra o Finora pelo ícone e volte aqui.",
    blocked: "As notificações estão bloqueadas para o Finora. Libere nas configurações do navegador ou do celular.",
    off: "Avisos de fatura perto de vencer, orçamento estourado e meta atingida, no máximo uma vez por dia.",
    on: "Ativas neste aparelho. Você recebe avisos de fatura, orçamento e metas.",
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-body-sm text-ink-muted">
        {isDemo ? "A conta demo é compartilhada, então não recebe notificações." : description[state]}
      </p>
      <FormError message={error} />
      {notice && (
        <p role="status" className="text-body-sm text-ink">
          {notice}
        </p>
      )}
      {!isDemo && state === "off" && (
        <Button onClick={enable} disabled={pending} className="self-start">
          {pending ? "Ativando…" : "Ativar notificações"}
        </Button>
      )}
      {!isDemo && state === "on" && (
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={test} disabled={pending}>
            Enviar aviso de teste
          </Button>
          <Button variant="ghost" onClick={disable} disabled={pending}>
            Desativar
          </Button>
        </div>
      )}
    </div>
  );
}
