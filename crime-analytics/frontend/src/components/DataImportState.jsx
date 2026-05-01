function messageFromStatus(statusInfo, isChecking) {
  if (isChecking) {
    return {
      tone: "info",
      title: "Verific starea setului de date",
      description:
        "Aplicatia verifica daca importul din Excel trebuie rulat inainte de a incarca graficele si hartile.",
    };
  }

  if (statusInfo?.status === "running") {
    return {
      tone: "info",
      title: "Import date din Excel",
      description:
        "Serviciul ETL citeste fisierul sursa si incarca inregistrarile normalizate pentru panou, analiza si harta.",
    };
  }

  if (statusInfo?.status === "failed") {
    return {
      tone: "error",
      title: "Importul din Excel a esuat",
      description: statusInfo.error || "Serviciul ETL nu a putut pregati setul de date.",
    };
  }

  return null;
}

function toneClasses(tone) {
  if (tone === "error") {
    return "bg-red-500/10 border-red-500/30 text-red-200";
  }
  return "bg-blue-500/10 border-blue-500/30 text-blue-100";
}

function sourceLabel(statusInfo) {
  return statusInfo?.source_file || "data/raw/Crime_Data_from_2020_to_Present.xlsx";
}

export function DataImportBanner({ statusInfo, isChecking }) {
  const message = messageFromStatus(statusInfo, isChecking);
  if (!message) return null;

  return (
    <div className={`mb-6 rounded-xl border px-4 py-3 ${toneClasses(message.tone)}`}>
      <p className="text-sm font-semibold">{message.title}</p>
      <p className="mt-1 text-sm opacity-90">{message.description}</p>
      <p className="mt-2 text-xs opacity-80">
        Sursa: {sourceLabel(statusInfo)}
      </p>
    </div>
  );
}

export function DataImportPlaceholder({ statusInfo, isChecking }) {
  const message = messageFromStatus(statusInfo, isChecking);
  if (!message) return null;

  return (
    <div className={`rounded-2xl border p-6 ${toneClasses(message.tone)}`}>
      <h2 className="text-xl font-semibold">{message.title}</h2>
      <p className="mt-2 max-w-2xl text-sm opacity-90">{message.description}</p>
      <div className="mt-4 rounded-xl bg-black/10 px-4 py-3 text-sm">
        <p>Fisier sursa: {sourceLabel(statusInfo)}</p>
        {statusInfo?.last_run_at && (
          <p className="mt-1 opacity-80">Ultima actualizare de stare: {statusInfo.last_run_at}</p>
        )}
      </div>
    </div>
  );
}
