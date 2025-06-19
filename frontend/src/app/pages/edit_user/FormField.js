export default function FormField({ label, name, value, onChange, type = "text", placeholder = "", ...props }) {
    return (
        <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">{label}</label>
            <input
                type={type}
                name={name}
                value={value || ''}
                onChange={onChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white placeholder-gray-400"
                placeholder={placeholder}
                {...props}
            />
        </div>
    );
}
