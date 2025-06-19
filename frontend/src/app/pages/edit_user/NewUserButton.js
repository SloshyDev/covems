import { UserPlusIcon } from '@heroicons/react/24/outline';

export default function NewUserButton({ onClick }) {
    return (
        <button
            onClick={onClick}
            className="bg-green-600 hover:bg-green-700 w-max text-white font-semibold px-6 py-3 rounded-lg shadow transition-colors duration-200 flex items-center gap-2"
        >
            <UserPlusIcon className="h-6 w-6" />
            Nuevo Usuario
        </button>
    );
}
