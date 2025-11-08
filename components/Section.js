export default function Section({title, children}){
  return (
    <section className="bg-white rounded-2xl shadow p-5 md:p-6">
      {title && <h2 className="text-lg font-semibold mb-3">{title}</h2>}
      {children}
    </section>
  )
}
