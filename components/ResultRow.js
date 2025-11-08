export function ResultRow({label, value, bold=false}){
  return (
    <div className="flex justify-between py-1">
      <span className="text-gray-700">{label}</span>
      <span className={bold ? "font-semibold" : ""}>{value}</span>
    </div>
  )
}
