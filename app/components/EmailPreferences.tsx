interface EmailPreferencesProps {
  emailOptInChoice: 'yes' | 'no' | null;
  onChoiceChange: (choice: 'yes' | 'no') => void;
  onSave: () => void;
  saving: boolean;
  status: string | null;
}

export function EmailPreferences({ emailOptInChoice, onChoiceChange, onSave, saving, status }: EmailPreferencesProps) {
  return (
    <div className="mb-6 bg-white rounded-lg shadow-md border border-zinc-200 p-6">
      <h2 className="text-lg font-semibold text-zinc-900 mb-1">
        Daily Meal Plan Emails
      </h2>
      <p className="text-sm text-zinc-600 mb-4">
        Would you like to receive daily meal plan recommendations and highlights of your favorite NAV meals?
      </p>
      <div className="flex items-center gap-6 mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="emailOptIn"
            checked={emailOptInChoice === 'yes'}
            onChange={() => onChoiceChange('yes')}
            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-zinc-700">Yes</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="emailOptIn"
            checked={emailOptInChoice === 'no'}
            onChange={() => onChoiceChange('no')}
            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-zinc-700">No</span>
        </label>
      </div>
      <button
        onClick={onSave}
        disabled={saving || emailOptInChoice === null}
        className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 text-white font-medium text-sm transition-colors"
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
      {status && (
        <p className={`mt-3 text-sm ${status.includes('inbox') ? 'text-green-600' : status.includes('not') ? 'text-zinc-500' : 'text-red-600'}`}>
          {status}
        </p>
      )}
    </div>
  );
}
