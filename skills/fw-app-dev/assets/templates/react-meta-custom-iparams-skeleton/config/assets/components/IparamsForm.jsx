import { useEffect, useRef, useState } from 'react';
import { InputField } from '@freshworks/dew-components';

function readInputValue(event) {
  return event.target?.value ?? event.detail?.value ?? '';
}

export default function IparamsForm() {
  const [sampleText, setSampleText] = useState('');
  const formRef = useRef({ sampleText: '' });

  useEffect(() => {
    window.getConfigs = (configs) => {
      const value = configs?.sample_text ?? '';
      formRef.current.sampleText = value;
      setSampleText(value);
    };

    window.postConfigs = () => ({
      sample_text: formRef.current.sampleText,
    });

    window.validate = () =>
      formRef.current.sampleText.trim()
        ? {}
        : { sample_text: 'Sample text is required' };
  }, []);

  const updateSampleText = (event) => {
    const value = readInputValue(event);
    formRef.current.sampleText = value;
    setSampleText(value);
  };

  return (
    <main className="iparams-form">
      <h1>Installation parameters</h1>
      <InputField
        label="Sample text"
        value={sampleText}
        onInput={updateSampleText}
      />
    </main>
  );
}
