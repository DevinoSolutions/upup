import { Meta, Story } from '@storybook/react';
import { UploadFiles, UploadFilesProps } from '../src/components/UploadFiles';
import { IBaseConfigs, UploadAdapter, UpupUploader } from '../src';
import useUpup from '../src/hooks/useUpup';
import { UpupUploaderProps } from '../src/UpupUploader';

const meta: Meta = {
  title: 'Upload files',
  component: UploadFiles,
  argTypes: {},
  parameters: {
    controls: { expanded: true },
  },
};

export default meta;

const Template: Story<UpupUploaderProps> = (args) => {
  const { baseConfigs, cloudStorageConfigs, googleConfigs, oneDriveConfigs } =
    useUpup();
  const uploadAdapters: UploadAdapter[] = [
    UploadAdapter.internal,
    UploadAdapter.google_drive,
    UploadAdapter.one_drive,
  ];
  return (
    <UpupUploader
      {...args}
      baseConfigs={baseConfigs}
      uploadAdapters={uploadAdapters}
      cloudStorageConfigs={cloudStorageConfigs}
      googleConfigs={googleConfigs}
      oneDriveConfigs={oneDriveConfigs}
    />
  );
};

// By passing using the Args format for exported stories, you can control the props for a component for reuse in a test
// https://storybook.js.org/docs/react/workflows/unit-testing
export const Default = Template.bind({});

Default.args = {};
