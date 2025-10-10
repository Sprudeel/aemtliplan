import { reactive } from "vue";

type SnackbarColor = "success" | "error" | "warning" | "info";

interface SnackbarState {
  show: boolean;
  message: string;
  color: SnackbarColor;
  timeout: number;
}

const state = reactive<SnackbarState>({
  show: false,
  message: "",
  color: "success",
  timeout: 4000,
});

export function useSnackbar() {
  function open(
    message: string,
    color: SnackbarColor = "success",
    timeout = 4000,
  ) {
    state.message = message;
    state.color = color;
    state.timeout = timeout;
    state.show = true;
  }

  function close() {
    state.show = false;
  }

  return {
    snackbar: state,
    open,
    close,
  };
}
