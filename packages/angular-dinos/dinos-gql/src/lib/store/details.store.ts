import { computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { DinosCrudService } from '../dinos-crud.service';
import { emptyState } from '../models/details.state';
import {
  Dinosaur,
  errorParser,
  validateDino,
  validateUpdateDino,
} from '../models/dinosaur';
import { updateDinoErrors, withErrors } from './with-dino-errors.store';
import { withEditDino } from './with-edit-dino.store';

export const EditDinoStore = signalStore(
  withState(emptyState()),
  withErrors<Dinosaur>(),
  withComputed(({ dinosaur, savePending }) => ({
    displayTrivia: computed(() => dinosaur.trivia().length),
    genusSpecies: computed(() => `${dinosaur.genus()} ${dinosaur.species()}`),
    showSaveSpinner: computed(() => savePending()),
  })),
  withEditDino(),
);

export const DetailsStore = signalStore(
  withState(emptyState()),
  withErrors<Dinosaur>(),
  withComputed(({ dinosaur, savePending }) => ({
    displayTrivia: computed(() => dinosaur.trivia().length),
    genusSpecies: computed(() => `${dinosaur.genus()} ${dinosaur.species()}`),
    showSaveSpinner: computed(() => savePending()),
  })),
  withMethods((state) => {
    const dinosCrudService = inject(DinosCrudService);
    const router = inject(Router);

    return {
      setEditMode: (editMode: boolean | undefined) => {
        patchState(state, { editMode: editMode ?? false });
      },
      setId: async (id: string | undefined) => {
        if (id == null) {
          return;
        }

        patchState(state, { id });

        const dino = await dinosCrudService.getDinoPromise(id);

        if (dino.hasValue) {
          patchState(state, { dinosaur: dino.value });
        }

        if (dino.hasError) {
          console.error('dino error', dino.error);
        }
      },
      updateDino: async (dino: Dinosaur) => {
        const errors = validateUpdateDino(dino);

        console.log('errors', errors);

        patchState(state, updateDinoErrors(errors));

        if (Object.keys(errors).length) {
          return;
        }
        console.log('Saving dino...', dino);

        console.log('Current state', state.dinosaur().id);

        const id = state.dinosaur().id;

        if (!id) {
          console.error('No id found for dino', dino);
          return;
        }

        const result = await dinosCrudService.updateDinoPromise(dino, id);

        console.log('save result', result);

        patchState(state, { savePending: result.pending });

        if (!result.finalized) {
          return;
        }

        if (result.hasValue) {
          router.navigate(['dinos']);

          return;
        }

        if (result.hasError) {
          const errorWithMessage = errorParser.safeParse(result.error);

          if (errorWithMessage.success) {
            patchState(state, {
              networkError: errorWithMessage.data.message,
            });

            return;
          }

          patchState(state, { networkError: `Unknown error: ${result.error}` });
        }
      },
      createDino: async (dino: Dinosaur) => {
        const errors = validateDino(dino);

        console.log('errors', errors);

        patchState(state, updateDinoErrors(errors));

        if (Object.keys(errors).length) {
          return;
        }

        console.log('Saving dino...', dino);

        const result = await dinosCrudService.createDinoPromise(dino);

        patchState(state, { savePending: result.pending });

        if (!result.finalized) {
          return;
        }

        console.log('result', result);

        if (result.hasValue) {
          router.navigate(['dinos']);
        }

        if (result.hasError) {
          const errorWithMessage = errorParser.safeParse(result.error);

          if (errorWithMessage.success) {
            patchState(state, {
              networkError: errorWithMessage.data.message,
            });

            return;
          }

          patchState(state, { networkError: `Unknown error: ${result.error}` });
        }
      },
    };
  }),
);
