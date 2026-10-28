// Keep the supplied artwork intact; CSS adapts the lockup to small screens.
const brandBase = `${import.meta.env.BASE_URL}brand/`

export function Brand() {
  return (
    <div
      className="brand brand-artwork"
      role="img"
      aria-label="La Ressourcerie du Quartier"
    >
      <img
        className="header-logo"
        src={`${brandBase}ressourcerie-logo.webp`}
        alt=""
        width="1280"
        height="427"
      />
      <img
        className="header-emblem"
        src={`${brandBase}ressourcerie-emblem.webp`}
        alt=""
        width="500"
        height="500"
      />
      <span className="mobile-wordmark" aria-hidden="true">
        <span>La Ressourcerie</span>
        <strong>
          du <em>Quartier</em>
        </strong>
      </span>
    </div>
  )
}

export function BrandEmblem() {
  return (
    <img
      className="hero-emblem"
      src={`${brandBase}ressourcerie-emblem.webp`}
      alt=""
      width="500"
      height="500"
    />
  )
}
